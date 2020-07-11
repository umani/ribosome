import { Identity } from "./identity"
import { TemplateBuilder } from "../builder"
import { Reference, MapVariableOrProperty, VariableOrProperty } from "../vtl/reference"

export class Context {
    private readonly ctx: Reference
    public constructor(protected readonly builder: TemplateBuilder) {
        this.ctx = new VariableOrProperty(this.builder, "ctx")
    }

    public readonly identity = new Identity(this.builder)

    public readonly stash = new MapVariableOrProperty(this.builder, "$ctx.stash")

    //TODO: Maybe introduce a ReadOnlyMap for consistency?
    public args(): Reference {
        return this.ctx.access("args")
    }

    public arg(arg: string): Reference {
        return this.args().access(arg)
    }

    public source(arg: string): Reference {
        return this.ctx.access("source").access(arg)
    }

    public prevResult(arg: string): Reference {
        return this.ctx.access("prev").access("result").access(arg)
    }
}

export class ResultContext extends Context {
    public result(arg: string): Reference {
        return this.builder.literal(`$ctx.result.${arg}`)
    }
}
