import { MappingTemplate, MappingTemplateVersion } from "./mapping-template"
import { Conditional } from "./vtl/conditional"
import { Reference, MapReference, Literal, Expression } from "./vtl/reference"
import { indent } from "./indent"

export class TemplateBuilder extends MappingTemplate {
    // FIXME: hold version here
    private variableCount = 0
    private templates: MappingTemplate[] = []
    private currentCapture: MappingTemplate[] | undefined = undefined

    constructor(public readonly version: MappingTemplateVersion) {
        super()
    }

    public appendTemplate(t: MappingTemplate): void {
        ;(this.currentCapture || this.templates).push(t)
    }

    // Called when an expression is being used as part of another expression,
    // and thus shouldn't be output by the builder.
    public consume(toRemove: MappingTemplate): void {
        this.templates = this.templates.filter(t => t !== toRemove)
        if (this.currentCapture) {
            this.currentCapture = this.currentCapture.filter(t => t !== toRemove)
        }
    }

    // Allowed types: array, number, boolean, map, string
    public literal(value: unknown): Expression {
        return value instanceof Expression ? value : new Literal(this, value)
    }

    private init(v: Reference, init: unknown): void {
        v.assign(init instanceof Expression ? init : this.literal(init))
    }

    public variable(init?: unknown): Reference {
        const v = new Reference(this, `var${this.variableCount++}`)
        this.init(v, init !== undefined ? init : "")
        return v
    }

    public map(init?: unknown): MapReference {
        const v = new MapReference(this, `var${this.variableCount++}`)
        this.init(v, init !== undefined ? init : {})
        return v
    }

    public ret(value?: unknown): void {
        const v = this.literal(value)
        this.consume(v)
        this.appendTemplate(
            MappingTemplate.from(i => " ".repeat(i) + (value ? `#return(${v.renderTemplate(0)})` : "#return")),
        )
    }

    public if(condition: unknown, body: () => void): Conditional {
        const c = this.literal(condition)
        this.consume(c)
        return new Conditional(this, c, body)
    }

    public unless(condition: unknown, body: () => void): Conditional {
        return this.if(this.literal(condition).not(), body)
    }

    public foreach(collection: unknown, body: (itVar: Reference) => void): void {
        const loopVar = new Reference(this, `var${this.variableCount++}`)
        this.consume(loopVar)
        const statements = this.capture(() => body(loopVar))
        const l = this.literal(collection)
        this.consume(l)
        this.appendTemplate(
            MappingTemplate.from(i => {
                return [
                    indent(i, `#{foreach}(${loopVar.renderTemplate(0)} in ${l.renderTemplate(0)})`),
                    ...statements.map(t => t.renderTemplate(i + 2)),
                    indent(i, "#{end}"),
                ].join("\n")
            }),
        )
    }

    public renderTemplate(indent: number): string {
        return this.templates
            .map(t => t.renderTemplate(indent))
            .filter(t => t !== "")
            .join("\n")
    }

    // Utility to capture MappingTemplates that are added
    // during the execution of the specified function.
    public capture(f: () => void): MappingTemplate[] {
        const prevCapture = this.currentCapture
        this.currentCapture = []
        f()
        const capture = this.currentCapture
        this.currentCapture = prevCapture
        return capture
    }
}
