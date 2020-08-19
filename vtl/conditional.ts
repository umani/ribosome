import { MappingTemplate } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { indent } from "../indent"
import { Expression } from "./reference"

interface Cond {
    readonly condition: Expression
    readonly body: () => void
}

export class Conditional extends MappingTemplate {
    private readonly _then: Cond
    private readonly _elseThen: Cond[] = []
    private readonly _else?: () => void

    public constructor(private readonly builder: TemplateBuilder, condition: Expression, body: () => void) {
        super()
        this._then = { condition, body }
        builder.appendTemplate(this)
    }

    public elseIf(cond: unknown, body: () => void): Conditional {
        const l = this.builder.literal(cond)
        l.consume()
        this._elseThen.push({ condition: l, body })
        return this
    }

    public else(body: () => void): void {
        this.else = body
    }

    public renderTemplate(i: number): string {
        const doRenderCondition = (tag: string, body: () => void, cond?: MappingTemplate): string[] => [
            indent(i, `#{${tag}}${cond ? `(${cond.renderTemplate(0)})` : ""}`),
            ...this.builder.capture(body).map(t => {
                return t.renderTemplate(i + 2)
            }),
        ]
        return [
            ...doRenderCondition("if", this._then.body, this._then.condition),
            ...this._elseThen.flatMap(({ condition, body }) => doRenderCondition("elseif", body, condition)),
            ...(this._else ? doRenderCondition("else", this._else) : []),
            indent(i, "#{end}"),
        ].join("\n")
    }
}
