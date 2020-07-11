import { MappingTemplate, MappingTemplateVersion } from "./mapping-template"
import { Conditional } from "./vtl/conditional"
import { Reference, VariableOrProperty, MapVariableOrProperty, Literal } from "./vtl/reference"
import { indent } from "./indent"

// Evaluation model:
// Functions that return a value don't modify the template list;
// Functions that don't return a value can modify the template list.
export class TemplateBuilder extends MappingTemplate {
    private variableCount = 0
    private templates: MappingTemplate[] = []

    public appendTemplate(t: MappingTemplate): void {
        this.templates.push(t)
    }

    // Allowed types: array, number, boolean, map, string
    public literal(value: unknown): Literal {
        return value instanceof Reference ? value : new Literal(this, value)
    }

    private maybeInit(v: VariableOrProperty, init?: unknown): void {
        if (init !== undefined) {
            // This is an exception to the evaluation model.
            v.assign(init instanceof Reference ? init : this.literal(init))
        }
    }

    public variable(init?: unknown): VariableOrProperty {
        const v = new VariableOrProperty(this, `var${this.variableCount++}`)
        this.maybeInit(v, init)
        return v
    }

    public map(init?: unknown): MapVariableOrProperty {
        const v = new MapVariableOrProperty(this, `var${this.variableCount++}`)
        this.maybeInit(v, init)
        return v
    }

    public ret(value?: unknown): void {
        const v = this.literal(value)
        this.appendTemplate(
            MappingTemplate.from((_, i) => " ".repeat(i) + (value ? `#return(${v.renderTemplate(_, 0)})` : "#return")),
        )
    }

    public if(condition: unknown, body: () => void): Conditional {
        return new Conditional(this, this.literal(condition), body)
    }

    public foreach(collection: unknown, body: (itVar: Reference) => void): void {
        const loopVar = this.variable()
        const statements = this.withScope(() => body(loopVar))
        this.appendTemplate(
            MappingTemplate.from((v, i) => {
                return [
                    indent(
                        i,
                        `#foreach(${loopVar.renderTemplate(v, 0)} in ${this.literal(collection).renderTemplate(v, 0)})`,
                    ),
                    ...statements.map(t => t.renderTemplate(v, i + 2)),
                    indent(i, "#end"),
                ].join("\n")
            }),
        )
    }

    public renderTemplate(v: MappingTemplateVersion, indent: number): string {
        return this.templates.map(t => t.renderTemplate(v, indent)).join("\n")
    }

    // Utility to control the order in which MappingTemplates
    // are added to the template list.
    public withScope(f: () => void): MappingTemplate[] {
        const oldScope = this.templates
        const scope: MappingTemplate[] = []
        this.templates = scope
        f()
        this.templates = oldScope
        return scope
    }
}
