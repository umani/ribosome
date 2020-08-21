import { MappingTemplate } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { indent } from "../indent"

// Reference: https://velocity.apache.org/engine/1.7/user-guide.html#set
// Note: We consider VTL 1.7, which is linked from AppSync documentation.
//       Indeed, AppSync doesn't seem to support newer features.

// Expressions are references, literals, relational expressions and arithmetic expressions.
// A reference is a VTL entity that represents some data within a context. References can
// be variables, method calls, or properties.
// A directive denotes an actions: #if, #foreach and #set. They all take Expressions, with the
// left-hand side of #set being a Reference.

// Note: type-safety has limits here. For example, to make it easier to write
// literals (e.g., 5, "str", etc.), we represent expressions as "unknown".

// TODO: Validate VTL identifiers follow the rules:
// must start with an alphabetic character (a .. z or A .. Z).
// alphabetic (a .. z, A .. Z)
// numeric (0 .. 9)
// hyphen ("-")
// underscore ("_")

export abstract class Expression extends MappingTemplate {
    protected _quiet = false

    public constructor(protected readonly builder: TemplateBuilder) {
        super()
        this.builder.appendTemplate(this)
    }

    public consume(): this {
        this.builder.consume(this)
        return this
    }

    public quiet(): this {
        this._quiet = true
        return this
    }

    public not(): Expression {
        return new UnaryExpression(this.builder, "!", this)
    }

    public eq(other: unknown): Expression {
        return this.binOp(other, "==")
    }

    public ne(other: unknown): Expression {
        return this.binOp(other, "!=")
    }

    public and(other: unknown): Expression {
        return this.binOp(other, "&&")
    }

    public or(other: unknown): Expression {
        return this.binOp(other, "||")
    }

    public gt(other: unknown): Expression {
        return this.binOp(other, ">")
    }

    public ge(other: unknown): Expression {
        return this.binOp(other, ">=")
    }

    public lt(other: unknown): Expression {
        return this.binOp(other, "<")
    }

    public le(other: unknown): Expression {
        return this.binOp(other, "<=")
    }

    public add(other: unknown): Expression {
        return this.binOp(other, "+")
    }

    public sub(other: unknown): Expression {
        return this.binOp(other, "-")
    }

    public mul(other: unknown): Expression {
        return this.binOp(other, "*")
    }

    public div(other: unknown): Expression {
        return this.binOp(other, "/")
    }

    public rem(other: unknown): Expression {
        return this.binOp(other, "%")
    }

    public to(other: unknown): Expression {
        return this.binOp(other, "..", false)
    }

    private binOp(other: unknown, op: string, parens = true): Expression {
        return new BinaryExpression(this.builder, op, this, this.builder.literal(other), parens)
    }

    public toString(): string {
        this.consume()
        return this.renderTemplate(0)
    }
}

export class UnaryExpression extends Expression {
    constructor(builder: TemplateBuilder, private readonly op: string, private readonly ref: Expression) {
        super(builder)
        ref.consume()
    }

    public renderTemplate(i: number): string {
        return indent(i, `${this.op}${this.ref.renderTemplate(i)}`)
    }
}

export class BinaryExpression extends Expression {
    constructor(
        builder: TemplateBuilder,
        private readonly op: string,
        private readonly exp1: Expression,
        private readonly exp2: Expression,
        private readonly parens: boolean = true,
    ) {
        super(builder)
        exp1.consume()
        exp2.consume()
    }

    public renderTemplate(i: number): string {
        return indent(
            i,
            `${this.parens ? "(" : ""}${this.exp1.renderTemplate(0)} ${this.op} ${this.exp2.renderTemplate(0)}${
                this.parens ? ")" : ""
            }`,
        )
    }
}

export class Reference extends Expression {
    public constructor(builder: TemplateBuilder, public readonly name: string) {
        super(builder)
    }

    public assign(value: unknown): void {
        this.consume()
        const l = this.builder.literal(value).consume()
        this.builder.appendTemplate(
            MappingTemplate.from(i => indent(i, `#set($${this.name} = ${l.renderTemplate(0)})`)),
        )
    }

    public invoke(method: string, ...args: unknown[]): Reference {
        this.consume()
        for (const a of args) {
            if (a instanceof BinaryExpression || a instanceof UnaryExpression) {
                throw new Error("Version 1.7 of VTL doesn't allow non-reference expressions as arguments")
            }
        }
        const m = new Method(this.builder, this.name, method, args)
        if (this._quiet) {
            m.quiet()
        }
        return m
    }

    // Access models property accesses of the form $ref.prop
    public access(k: string): Reference {
        this.consume()
        const p = new Reference(this.builder, `${this.name}.${k}`)
        if (this._quiet) {
            p.quiet()
        }
        return p
    }

    public index(idx: unknown): Reference {
        this.consume()
        return new Reference(this.builder, `${this.name}[${stringify(idx, 0)}]`)
    }

    // Like access(), but asserts that the returned reference if a Map.
    public accessMap(k: string): MapReference {
        this.consume()
        const p = new MapReference(this.builder, `${this.name}.${k}`)
        if (this._quiet) {
            p.quiet()
        }
        return p
    }

    public renderTemplate(i: number): string {
        const prefix = this._quiet ? "$!{" : "${"
        return indent(i, `${prefix}${this.name}}`)
    }
}

export class MapReference extends Reference {
    public constructor(builder: TemplateBuilder, name: string) {
        super(builder, name)
    }

    public get(k: unknown): Reference {
        return this.invoke("get", k)
    }

    public put(k: unknown, v: unknown): Reference {
        return this.invoke("put", this.builder.literal(k), this.builder.literal(v))
    }

    public putAll(m: unknown): Reference {
        return this.invoke("putAll", this.builder.literal(m))
    }

    public entrySet(): Reference {
        return this.invoke("entrySet")
    }
}

// TODO: Array reference with index method

export class Method extends Reference {
    private readonly args: Literal[]

    public constructor(builder: TemplateBuilder, target: string, public readonly method: string, args: unknown[]) {
        super(builder, target)
        this.args = args.map(a => new Literal(this.builder, a).consume())
    }

    public renderTemplate(i: number): string {
        const prefix = this._quiet ? "$!" : "$"
        return indent(
            i,
            `${prefix}{${this.name}.${this.method}(${this.args.map(a => a.renderTemplate(0)).join(", ")})}`,
        )
    }
}

function consume(v: unknown): void {
    if (v instanceof Expression) {
        v.consume()
    } else if (v instanceof Array) {
        v.forEach(consume)
    } else if (v instanceof Object) {
        Object.values(v).map(consume)
    }
}

function stringify(v: unknown, i: number): string {
    if (v === undefined) {
        return ""
    }
    if (v instanceof Expression) {
        return v.toString()
    }
    if (typeof v === "string" || typeof v === "boolean" || typeof v === "number") {
        return JSON.stringify(v)
    }
    if (v instanceof Array) {
        return "[" + (v as Array<unknown>).map(e => stringify(e, 0)).join(", ") + "]"
    }
    if (v instanceof Object) {
        const contents = Object.entries(v)
            .map(([k, v]) => indent(i + 2, `"${k}": ${stringify(v, i + 2)}`))
            .join(",\n")
        return contents.length > 0 ? ["{", contents, indent(i, "}")].join("\n") : "{ }"
    }
    throw new Error(`Variable ${v} is of unsupported type`)
}

export class Literal extends Reference {
    public constructor(builder: TemplateBuilder, private readonly value: unknown) {
        super(builder, stringify(value, 0))
        consume(value)
    }

    public renderTemplate(i: number): string {
        return indent(i, stringify(this.value, i))
    }
}
