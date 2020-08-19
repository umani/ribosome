import { Identity } from "./identity"
import { TemplateBuilder } from "../builder"
import { Reference, MapReference } from "../vtl/reference"
import { ErrorResult } from "./error"

export class Context {
    protected readonly ctx: Reference

    public constructor(protected readonly builder: TemplateBuilder) {
        this.ctx = new Reference(this.builder, "ctx").consume()
    }

    public get identity(): Identity {
        return new Identity(this.builder, this.ctx.access("identity"))
    }

    public get args(): MapReference {
        return this.ctx.accessMap("args")
    }

    public arg(arg: string): Reference {
        return this.args.access(arg)
    }

    public get stash(): MapReference {
        return this.ctx.accessMap("stash")
    }

    public source(arg: string): Reference {
        return this.ctx.access("source").access(arg)
    }

    public prevResult(arg: string): Reference {
        return this.ctx.access("prev").access("result").access(arg)
    }
}

export class ResultContext extends Context {
    public get results(): Reference {
        return this.ctx.accessMap("result")
    }

    public get error(): ErrorResult {
        return new ErrorResult(this.builder, this.ctx.access("error"))
    }

    public result(arg: string): Reference {
        return this.results.access(arg)
    }
}
