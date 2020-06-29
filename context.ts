import { Identity } from "./identity"
import { TemplateBuilder } from "./builder"

export class Context {
    public constructor(private readonly builder: TemplateBuilder) {}

    public readonly identity = new Identity(this.builder)

    public args(arg: string): string {
        return `$ctx.args.${arg}`
    }
}
