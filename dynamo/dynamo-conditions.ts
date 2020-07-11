import { Reference } from "../vtl/reference"
import { MappingTemplate, MappingTemplateVersion } from "../mapping-template"
import { indent } from "../indent"

abstract class AttributeAliasGenerator {
    protected readonly dedup: Record<string, string> = {}

    public length(): number {
        return Object.keys(this.dedup).length
    }

    public translation(): string {
        return Object.entries(this.dedup)
            .sort((e1, e2) => e1[1].localeCompare(e2[1]))
            .map(e => `"${e[1]}": ${e[0]}`)
            .join(",")
    }
}

class AttributeValueAliasGenerator extends AttributeAliasGenerator {
    private generator = 0

    public aliasFor(attributeValue: string): string {
        const actualValue = `$util.dynamodb.toDynamoDBJson(${attributeValue})`
        let alias = this.dedup[actualValue]
        if (alias === undefined) {
            alias = `:arg${this.generator++}`
            this.dedup[actualValue] = alias
        }
        return alias
    }
}

class AttributeNameAliasGenerator extends AttributeAliasGenerator {
    public aliasFor(attributeValue: string): string {
        const attr = `#${attributeValue}`
        this.dedup[`"${attributeValue}"`] = attr
        return attr
    }
}

interface OperandCollector {
    readonly attributeNames: AttributeNameAliasGenerator
    readonly attributeValues: AttributeValueAliasGenerator
}

/**
 * Represents an operand to comparators and functions.
 */
export interface IOperand {
    /**
     * @internal
     */
    _render(collector: OperandCollector, v: MappingTemplateVersion): string
}

/**
 * Utility class to represent DynamoDB conditions.
 */
abstract class BaseCondition {
    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        const collector: OperandCollector = {
            attributeNames: new AttributeNameAliasGenerator(),
            attributeValues: new AttributeValueAliasGenerator(),
        }
        const condition = this.renderCondition(collector, v)
        const template = [indent(i, `"expression": "${condition}"`)]
        if (collector.attributeNames.length() > 0) {
            template.push(
                [
                    indent(i, `"expressionNames": {"`),
                    indent(i + 2, collector.attributeNames.translation()),
                    indent(i, "}"),
                ].join("\n"),
            )
        }
        if (collector.attributeValues.length() > 0) {
            template.push(
                [
                    indent(i, `"expressionNames": {"`),
                    indent(i + 2, collector.attributeValues.translation()),
                    indent(i, "}"),
                ].join("\n"),
            )
        }
        return template.join(",\n")
    }

    public abstract renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string
}

/**
 * Function operands, such as the `size` function.
 */
abstract class FunctionCondition extends BaseCondition implements IOperand {
    /**
     * @internal
     */
    public _render(collector: OperandCollector, v: MappingTemplateVersion): string {
        return this.renderCondition(collector, v)
    }
}

/**
 * Operand from VTL references. This bridges the template
 * world with the DynamoDB world.
 */
class ReferenceOperand implements IOperand {
    public constructor(private readonly arg: Reference) {}

    public _render(collector: OperandCollector, v: MappingTemplateVersion): string {
        return collector.attributeValues.aliasFor(this.arg.renderTemplate(v, 0))
    }
}

/**
 * Attribute operand, a DynamoDB attribute name. Might be a path.
 */
class AttributeOperand implements IOperand {
    constructor(private readonly arg: string) {}

    public _render(collector: OperandCollector, _: MappingTemplateVersion): string {
        return collector.attributeNames.aliasFor(this.arg)
    }
}

/**
 * Utility class for functions that operate on attributes.
 */
class AttributeFunction extends FunctionCondition {
    public constructor(private readonly attr: AttributeOperand, private readonly func: string) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `${this.func}(${this.attr._render(collector, v)})`
    }
}

/**
 * Utility class for functions that operate on attributes and take an argument.
 */
class AttributeValueFunction extends BaseCondition {
    constructor(
        private readonly attr: AttributeOperand,
        private readonly arg: IOperand,
        private readonly func: string,
    ) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `${this.func}(${this.attr._render(collector, v)}, ${this.arg._render(collector, v)})`
    }
}

/**
 * Utility class to represent DynamoDB "AND" and "OR" conditions.
 */
class BinaryCondition extends BaseCondition {
    constructor(
        private readonly left: BaseCondition,
        private readonly operator: string,
        private readonly right: BaseCondition,
    ) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `(${this.left.renderCondition(collector, v)}) ${this.operator} (${this.right.renderCondition(
            collector,
            v,
        )})`
    }
}

/**
 * Utility class to represent DynamoDB "AND" conditions.
 */
class And extends BinaryCondition {
    constructor(left: BaseCondition, right: BaseCondition) {
        super(left, "AND", right)
    }
}

/**
 * Utility class to represent DynamoDB "OR" conditions.
 */
class Or extends BinaryCondition {
    constructor(left: BaseCondition, right: BaseCondition) {
        super(left, "OR", right)
    }
}

/**
 * Utility class to represent DynamoDB "NOT" conditions.
 */
class Not extends BaseCondition {
    constructor(private readonly cond: BaseCondition) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `NOT (${this.cond.renderCondition(collector, v)})`
    }
}

/**
 * Utility class to represent DynamoDB binary conditions.
 */
class ComparatorCondition extends BaseCondition {
    constructor(private readonly attr: IOperand, private readonly op: string, private readonly arg: IOperand) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `${this.attr._render(collector, v)} ${this.op} ${this.arg._render(collector, v)}`
    }
}

/**
 * Utility class to represent DynamoDB "BETWEEN" conditions.
 */
class Between extends BaseCondition {
    constructor(
        private readonly attr: AttributeOperand,
        private readonly arg1: IOperand,
        private readonly arg2: IOperand,
    ) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `${this.attr._render(collector, v)} BETWEEN ${this.arg1._render(collector, v)} AND ${this.arg2._render(
            collector,
            v,
        )}`
    }
}

/**
 * Utility class to represent DynamoDB "IN" conditions.
 */
class In extends BaseCondition {
    constructor(private readonly attr: AttributeOperand, private readonly choices: IOperand[]) {
        super()
    }

    public renderCondition(collector: OperandCollector, v: MappingTemplateVersion): string {
        return `${this.attr._render(collector, v)} IN (${this.choices.map(c => c._render(collector, v)).join(", ")})`
    }
}

/**
 * Utility class to represent DynamoDB "attribute_exists" conditions.
 */
class AttributeExists extends AttributeFunction {
    constructor(attr: AttributeOperand) {
        super(attr, "attribute_exists")
    }
}

/**
 * Utility class to represent DynamoDB "attribute_not_exists" conditions.
 */
class AttributeNotExists extends AttributeFunction {
    constructor(attr: AttributeOperand) {
        super(attr, "attribute_not_exists")
    }
}

/**
 * Utility class to represent DynamoDB "size" conditions.
 */
class Size extends AttributeFunction {
    constructor(attr: AttributeOperand) {
        super(attr, "size")
    }
}

/**
 * Utility class to represent DynamoDB "begins_with" conditions.
 */
class BeginsWith extends AttributeValueFunction {
    constructor(attr: AttributeOperand, arg: IOperand) {
        super(attr, arg, "begins_with")
    }
}

/**
 * Utility class to represent DynamoDB "contains" conditions.
 */
class Contains extends AttributeValueFunction {
    constructor(attr: AttributeOperand, arg: IOperand) {
        super(attr, arg, "contains")
    }
}

/**
 * Utility class to represent DynamoDB "contains" conditions.
 */
class AttributeType extends AttributeValueFunction {
    constructor(attr: AttributeOperand, type: ReferenceOperand) {
        super(attr, type, "attribute_type")
    }
}

/**
 * Factory class for operands.
 */
export class Operand {
    /**
     * Returns an operand that's a DynamoDB attribute.
     */
    public static attribute(attr: string): IOperand {
        return new AttributeOperand(attr)
    }

    /**
     * Returns an operand that's a value, coming from the GraphQL request.
     */
    public static from(attr: Reference): IOperand {
        return new ReferenceOperand(attr)
    }

    /**
     * Returns an operand representing an attribute's size.
     */
    public static size(attr: string): IOperand {
        return new Size(new AttributeOperand(attr))
    }
}

/**
 * Factory class for DynamoDB key conditions.
 */
export class ConditionExpression extends MappingTemplate {
    /**
     * Condition `attr = arg`, true if the attribute `attr` is equal to `arg`
     */
    public static eq(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, "=", arg))
    }

    /**
     * Condition `attr <> arg`, true if the attribute `attr` is equal to `arg`
     */
    public static neq(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, "<>", arg))
    }

    /**
     * Condition `attr < arg`, true if the attribute `attr` is equal to `arg`
     */
    public static lt(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, "<", arg))
    }

    /**
     * Condition `attr <= arg`, true if the attribute `attr` is equal to `arg`
     */
    public static le(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, "<=", arg))
    }

    /**
     * Condition `attr > arg`, true if the attribute `attr` is equal to `arg`
     */
    public static gt(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, ">", arg))
    }

    /**
     * Condition `attr >= arg`, true if the attribute `attr` is equal to `arg`
     */
    public static ge(attr: IOperand, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new ComparatorCondition(attr, ">=", arg))
    }

    /**
     * True if the item contains the specified attribute.
     */
    public static attributeExists(attr: string): ConditionExpression {
        return new ConditionExpression(new AttributeExists(new AttributeOperand(attr)))
    }

    /**
     * True if the specified attribute does not exist in the item.
     */
    public static attributeNotExists(attr: string): ConditionExpression {
        return new ConditionExpression(new AttributeNotExists(new AttributeOperand(attr)))
    }

    /**
     * True if the specified attribute is of a particular data type.
     */
    public static attributeType(attr: string, type: Reference): ConditionExpression {
        return new ConditionExpression(new AttributeType(new AttributeOperand(attr), new ReferenceOperand(type)))
    }

    /**
     * True if the specified attribute begins with a particular substring.
     */
    public static beginsWith(attr: string, substr: IOperand): ConditionExpression {
        return new ConditionExpression(new BeginsWith(new AttributeOperand(attr), substr))
    }

    /**
     * True if the specified attributed is a string that contains a particular substring,
     * or a set that contains a particular element within the set. In either case,
     * argument must be a String. `attr` != `arg` must hold.
     */
    public static contains(attr: string, arg: IOperand): ConditionExpression {
        return new ConditionExpression(new Contains(new AttributeOperand(attr), arg))
    }

    /**
     * Condition attr BETWEEN arg1 AND arg2, true if attr >= arg1 and k <= arg2.
     */
    public static between(attr: string, arg1: IOperand, arg2: IOperand): ConditionExpression {
        return new ConditionExpression(new Between(new AttributeOperand(attr), arg1, arg2))
    }

    /**
     * Condition attr IN (arg1, arg2, ...), true if `attr` is equal to any
     * argument in the list. The list can contain up to 100 values.
     */
    public static in(attr: string, ...args: IOperand[]): ConditionExpression {
        if (args.length > 100) {
            throw new Error('"In" condition cannot have more than 100 values')
        }
        return new ConditionExpression(new In(new AttributeOperand(attr), args))
    }

    private constructor(private readonly cond: BaseCondition) {
        super()
    }

    /**
     * Conjunction between two conditions.
     */
    public and(condExpr: ConditionExpression): ConditionExpression {
        return new ConditionExpression(new And(this.cond, condExpr.cond))
    }

    /**
     * Disjunction between two conditions.
     */
    public or(condExpr: ConditionExpression): ConditionExpression {
        return new ConditionExpression(new Or(this.cond, condExpr.cond))
    }

    /**
     * Negates the current condition.
     */
    public negate(): ConditionExpression {
        return new ConditionExpression(new Not(this.cond))
    }

    /**
     * Renders the key condition to a VTL string.
     */
    public renderTemplate(v: MappingTemplateVersion, i: number): string {
        return [indent(i, `"condition": {"`), indent(i + 2, this.cond.renderTemplate(v, i)), indent(i, "}")].join("\n")
    }
}
