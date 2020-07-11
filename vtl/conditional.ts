import { MappingTemplate, MappingTemplateVersion } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { indent } from "../indent"

interface Cond {
    readonly condition: MappingTemplate
    readonly body: () => void
}

export class Conditional extends MappingTemplate {
    private readonly _then: Cond
    private readonly _elseThen: Cond[] = []
    private readonly _else?: () => void

    public constructor(private readonly builder: TemplateBuilder, condition: MappingTemplate, body: () => void) {
        super()
        this._then = { condition, body }
        builder.appendTemplate(this)
    }

    public elseIf(condition: MappingTemplate, body: () => void): Conditional {
        this._elseThen.push({ condition, body })
        return this
    }

    public else(body: () => void): void {
        this.else = body
    }

    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        const doRenderCondition = (tag: string, body: () => void, cond?: MappingTemplate): string[] => [
            indent(i, `#{${tag}} ${cond ? `(${cond.renderTemplate(v, 0)})` : ""}`),
            ...this.builder.withScope(() => body()).map(t => t.renderTemplate(v, i + 2)),
        ]
        return [
            ...doRenderCondition("if", this._then.body, this._then.condition),
            ...this._elseThen.flatMap(({ condition, body }) => doRenderCondition("elseif", body, condition)),
            ...(this._else ? doRenderCondition("else", this._else) : []),
            indent(i, "#{end}"),
        ].join("\n")
    }
}
