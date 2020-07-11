import { TemplateBuilder } from "../builder"
import { Reference, Method } from "./reference"

export class MethodWrapper {
    public constructor(private readonly builder: TemplateBuilder, private readonly target: string) {}

    public apply(method: string, ...args: (Reference | undefined)[]): Method {
        return new Method(
            this.builder,
            this.target,
            method,
            args.filter((f): f is Reference => Boolean(f)),
        )
    }
}
