import { MappingTemplate, MappingTemplateVersion } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { indent } from "../indent"

// Reference: https://velocity.apache.org/engine/1.7/user-guide.html#set

// TODO: Validate VTL identifiers follow the rules:
// must start with an alphabetic character (a .. z or A .. Z).
// alphabetic (a .. z, A .. Z)
// numeric (0 .. 9)
// hyphen ("-")
// underscore ("_")

// References can be variables, method calls, or properties.
// To make it easier to write literals (e.g., 5, "str", etc.),
// we represent references as "unknown".
export abstract class Reference extends MappingTemplate {
    protected _quiet = false

    public constructor(protected readonly builder: TemplateBuilder, protected readonly name: string) {
        super()
    }

    public quiet(): this {
        this._quiet = true
        return this
    }

    public invoke(method: string, ...args: unknown[]): Method {
        const m = new Method(this.builder, this.name, method, args)
        if (this._quiet) {
            m.quiet()
        }
        return m
    }

    public access(k: string): VariableOrProperty {
        const p = new VariableOrProperty(this.builder, `${this.name}.${this.builder.literal(k)}`)
        if (this._quiet) {
            p.quiet()
        }
        return p
    }

    // Operators

    public not(): Reference {
        return new UnaryConditionReference(this.builder, "!", this)
    }

    public eq(other: unknown): Reference {
        return this.binOp(other, "==")
    }

    public ne(other: unknown): Reference {
        return this.binOp(other, "!=")
    }

    public and(other: unknown): Reference {
        return this.binOp(other, "&&")
    }

    public or(other: unknown): Reference {
        return this.binOp(other, "||")
    }

    public gt(other: unknown): Reference {
        return this.binOp(other, ">")
    }

    public ge(other: unknown): Reference {
        return this.binOp(other, ">=")
    }

    public lt(other: unknown): Reference {
        return this.binOp(other, "<")
    }

    public le(other: unknown): Reference {
        return this.binOp(other, "<=")
    }

    public add(other: unknown): Reference {
        return this.binOp(other, "+")
    }

    public sub(other: unknown): Reference {
        return this.binOp(other, "-")
    }

    public mul(other: unknown): Reference {
        return this.binOp(other, "*")
    }

    public div(other: unknown): Reference {
        return this.binOp(other, "/")
    }

    public rem(other: unknown): Reference {
        return this.binOp(other, "%")
    }

    public to(other: unknown): Reference {
        return this.binOp(other, "..", false)
    }

    private binOp(other: unknown, op: string, parens = true): Reference {
        return new BinaryConditionReference(this.builder, op, this, this.builder.literal(other), parens)
    }

    public toString(): string {
        return this.renderTemplate(MappingTemplateVersion.V1, 0)
    }
}

// It's not super-pure to say conditions are references,
// but this is the easiest way to have a binary condition
// work on the result of some other condition or on a reference.
export class UnaryConditionReference extends Reference {
    constructor(builder: TemplateBuilder, private readonly op: string, private readonly ref: Reference) {
        super(builder, "")
    }

    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        return indent(i, `${this.op}${this.ref.renderTemplate(v, i)}`)
    }
}

export class BinaryConditionReference extends Reference {
    constructor(
        builder: TemplateBuilder,
        private readonly op: string,
        private readonly ref1: Reference,
        private readonly ref2: Reference,
        private readonly parens: boolean = true,
    ) {
        super(builder, "")
    }

    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        return indent(
            i,
            `${this.parens ? "(" : ""}${this.ref1.renderTemplate(v, 0)} ${this.op} ${this.ref2.renderTemplate(v, 0)}${
                this.parens ? ")" : ""
            }`,
        )
    }
}

export class VariableOrProperty extends Reference {
    public constructor(builder: TemplateBuilder, name: string) {
        super(builder, name)
    }

    public assign(value: unknown): void {
        this.builder.appendTemplate(
            MappingTemplate.from((v, i) =>
                indent(i, `#set($${this.name} = ${this.builder.literal(value).renderTemplate(v, 0)})`),
            ),
        )
    }

    public renderTemplate(_: MappingTemplateVersion, i: number): string {
        const prefix = this._quiet ? "$!{" : "${"
        return indent(i, `${prefix}${this.name}}`)
    }
}

export class MapVariableOrProperty extends VariableOrProperty {
    public constructor(builder: TemplateBuilder, name: string) {
        super(builder, name)
    }

    public get(k: string): VariableOrProperty {
        return this.access(k)
    }

    public put(k: unknown, v: unknown): void {
        this.invoke("put", this.builder.literal(k), this.builder.literal(v)).consume()
    }
}

export class Method extends Reference {
    public constructor(
        builder: TemplateBuilder,
        target: string,
        private readonly method: string,
        private readonly args: unknown[],
    ) {
        super(builder, target)
    }

    // Called when the method is just being called for side effects.
    public consume(): void {
        this.builder.appendTemplate(this)
    }

    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        const prefix = this._quiet ? "$!" : "$"
        return indent(
            i,
            `${prefix}{${this.name}.${this.method}(${this.args
                .map(r => new Literal(this.builder, r).renderTemplate(v, 0))
                .join(",")})}`,
        )
    }
}

function stringify(v: unknown): string {
    if (v instanceof Reference) {
        return v.toString()
    }
    if (v instanceof Array) {
        return "[" + (v as Array<unknown>).map(stringify).toString() + "]"
    }
    if (v instanceof Object) {
        const contents = Object.entries(v)
            .map(([k, v]) => `  "${k}": ${stringify(v)}`)
            .join("\n")
        return contents.length > 0 ? `{\n${contents}\n}` : "{ }"
    }
    if (typeof v === "string" || typeof v === "boolean" || typeof v === "number") {
        return JSON.stringify(v)
    }
    throw new Error(`Variable ${v} is of unsupported type`)
}

export class Literal extends Reference {
    public constructor(builder: TemplateBuilder, value: unknown) {
        super(builder, stringify(value))
    }

    public renderTemplate(_: MappingTemplateVersion, i: number): string {
        return indent(i, this.name)
    }
}
