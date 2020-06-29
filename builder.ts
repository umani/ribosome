import { MappingTemplate } from "./mapping-template"
import { Unless, If, ForEach } from "./statements"

export class TemplateBuilder extends MappingTemplate {
    readonly variables: string[] = []
    readonly templates: MappingTemplate[] = []

    public appendTemplate(t: MappingTemplate): void {
        this.templates.push(t)
    }

    public variable(val: string): string {
        const varName = `$var${this.variables.length}`
        this.variables.push(`#set(${varName} = ${val})`)
        return varName
    }

    // Should these statements introduce a new scope?
    // What are the scoping rules in VTL templates?
    public unless(condition: MappingTemplate, statements: MappingTemplate[]): MappingTemplate {
        return new Unless(condition, statements)
    }

    public if(condition: MappingTemplate, statements: MappingTemplate[]): MappingTemplate {
        return new If(condition, statements)
    }

    public foreach(collection: MappingTemplate, body: (itVar: string) => MappingTemplate[]): MappingTemplate {
        return new ForEach(collection, body)
    }

    public renderTemplate(): string {
        // We'll want to pretty-print this render.
        return this.variables.concat(this.templates.map(t => t.renderTemplate())).join("\n")
    }
}
