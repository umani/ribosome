import { Expression } from "../vtl/reference"
import { TemplateBuilder } from "../builder"
import { DynamoDBUtils } from "../appsync/dynamodb-utils"

export interface ResolvedCondition {
    readonly expression: string
    readonly expressionNames?: Record<string, string>
    readonly expressionValues?: Record<string, Expression>
}

export class ExpressionValuesAliasGenerator {
    public readonly result: Record<string, Expression> = {}
    private readonly dedup: Record<string, string> = {}
    private generator = 0

    constructor(protected readonly builder: TemplateBuilder) {}

    public aliasFor(attributeValue: Expression): string {
        const attrStr = attributeValue.toString()
        let alias = this.dedup[attrStr]
        if (alias === undefined) {
            alias = `:arg${this.generator++}`
            this.dedup[attrStr] = alias
            this.result[alias] = new DynamoDBUtils(this.builder).toDynamoDBJson(attributeValue)
        }
        return alias
    }
}

export class ExpressionNamesAliasGenerator {
    public readonly result: Record<string, string> = {}

    public aliasFor(attributeName: string): string {
        const attr = `#${attributeName}`
        this.result[attr] = attributeName
        return attr
    }
}

export interface OperandCollector {
    readonly expressionNames: ExpressionNamesAliasGenerator
    readonly expressionValues: ExpressionValuesAliasGenerator
}

/**
 * Represents an operand to comparators and functions.
 */
export interface IOperand {
    /**
     * @internal
     */
    _resolve(collector: OperandCollector): string
}

export interface Condition {
    expression: string
}

/**
 * Utility class to represent DynamoDB conditions.
 */
abstract class BaseCondition {
    public resolve(builder: TemplateBuilder): ResolvedCondition {
        const collector: OperandCollector = {
            expressionNames: new ExpressionNamesAliasGenerator(),
            expressionValues: new ExpressionValuesAliasGenerator(builder),
        }
        const condition = this.resolveCondition(collector)
        const expressionOrEmpty = (k: keyof OperandCollector): Partial<OperandCollector[keyof OperandCollector]> => 
            Object.entries(collector[k].result).length > 0 ? {
                [k]: collector[k].result
            } : {}
        return {
            expression: condition,
            ...expressionOrEmpty("expressionNames"),
            ...expressionOrEmpty("expressionValues"),
        }
    }

    public abstract resolveCondition(collector: OperandCollector): string
}

/**
 * Function operands, such as the `size` function.
 */
abstract class FunctionCondition extends BaseCondition implements IOperand {
    /**
     * @internal
     */
    public _resolve(collector: OperandCollector): string {
        return this.resolveCondition(collector)
    }
}

/**
 * Base class for DynamoDB attributes.
 */
export abstract class Attribute implements IOperand {
    public abstract _resolve(collector: OperandCollector): string

    static from(...attrs: string[]): Attribute {
        return attrs.length === 1 ? new AttributeOperand(attrs[0]) : new Path(attrs.map(a => new AttributeOperand(a)))
    }
}

/**
 * DynamoDB's path attribute.
 */
export class Path implements Attribute {
    constructor(private readonly path: Attribute[]) {}

    public _resolve(collector: OperandCollector): string {
        return this.path.map(p => p._resolve(collector)).join(".")
    }
}

/**
 * DynamoDB's ListItem Path is the path to a item in a list.
 */
export class ListItem extends Path {
    constructor(private readonly attr: Attribute, private readonly position: number) {
        super([])
    }

    public _resolve(collector: OperandCollector): string {
        return `${this.attr._resolve(collector)}[${this.position}]`
    }
}

/**
 * Attribute operand, a DynamoDB attribute name.
 */
export class AttributeOperand implements Attribute {
    constructor(private readonly arg: string) {}

    public _resolve(collector: OperandCollector): string {
        return collector.expressionNames.aliasFor(this.arg)
    }
}

/**
 * Utility class for functions that operate on attributes.
 */
class AttributeFunction extends FunctionCondition {
    public constructor(private readonly attr: AttributeOperand, private readonly func: string) {
        super()
    }

    public resolveCondition(collector: OperandCollector): string {
        return `${this.func}(${this.attr._resolve(collector)})`
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

    public resolveCondition(collector: OperandCollector): string {
        return `${this.func}(${this.attr._resolve(collector)}, ${this.arg._resolve(collector)})`
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

    public resolveCondition(collector: OperandCollector): string {
        return `(${this.left.resolveCondition(collector)}) ${this.operator} (${this.right.resolveCondition(collector)})`
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

    public resolveCondition(collector: OperandCollector): string {
        return `NOT (${this.cond.resolveCondition(collector)})`
    }
}

/**
 * Utility class to represent DynamoDB binary conditions.
 */
class ComparatorCondition extends BaseCondition {
    constructor(private readonly attr: IOperand, private readonly op: string, private readonly arg: IOperand) {
        super()
    }

    public resolveCondition(collector: OperandCollector): string {
        return `${this.attr._resolve(collector)} ${this.op} ${this.arg._resolve(collector)}`
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

    public resolveCondition(collector: OperandCollector): string {
        return `${this.attr._resolve(collector)} BETWEEN ${this.arg1._resolve(collector)} AND ${this.arg2._resolve(
            collector,
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

    public resolveCondition(collector: OperandCollector): string {
        return `${this.attr._resolve(collector)} IN (${this.choices.map(c => c._resolve(collector)).join(", ")})`
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
    constructor(attr: AttributeOperand, type: Expression) {
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
    public static from(attr: Expression): IOperand {
        return attr
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
export class Query {
    /**
     * Condition k = arg, true if the key attribute k is equal to the Query argument
     */
    public static eq(keyName: string, arg: Expression): Query {
        return new Query(new ComparatorCondition(new AttributeOperand(keyName), "=", arg))
    }

    /**
     * Condition k < arg, true if the key attribute k is less than the Query argument
     */
    public static lt(keyName: string, arg: Expression): Query {
        return new Query(new ComparatorCondition(new AttributeOperand(keyName), "<", arg))
    }

    /**
     * Condition k <= arg, true if the key attribute k is less than or equal to the Query argument
     */
    public static le(keyName: string, arg: Expression): Query {
        return new Query(new ComparatorCondition(new AttributeOperand(keyName), "<=", arg))
    }

    /**
     * Condition k > arg, true if the key attribute k is greater than the the Query argument
     */
    public static gt(keyName: string, arg: Expression): Query {
        return new Query(new ComparatorCondition(new AttributeOperand(keyName), ">", arg))
    }

    /**
     * Condition k >= arg, true if the key attribute k is greater or equal to the Query argument
     */
    public static ge(keyName: string, arg: Expression): Query {
        return new Query(new ComparatorCondition(new AttributeOperand(keyName), ">=", arg))
    }

    /**
     * Condition (k, arg). True if the key attribute k begins with the Query argument.
     */
    public static beginsWith(keyName: string, arg: Expression): Query {
        return new Query(new BeginsWith(new AttributeOperand(keyName), arg))
    }

    /**
     * Condition k BETWEEN arg1 AND arg2, true if k >= arg1 and k <= arg2.
     */
    public static between(keyName: string, arg1: Expression, arg2: Expression): Query {
        return new Query(new Between(new AttributeOperand(keyName), arg1, arg2))
    }

    private constructor(private readonly cond: BaseCondition) {}

    /**
     * Conjunction between two conditions.
     */
    public and(keyCond: Query): Query {
        return new Query(new And(this.cond, keyCond.cond))
    }

    /**
     * Resolves the condition to an object.
     */
    public resolve(builder: TemplateBuilder): ResolvedCondition {
        return this.cond.resolve(builder)
    }
}

/**
 * Factory class for DynamoDB key conditions.
 */
export class ConditionExpression {
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
    public static attributeType(attr: string, type: Expression): ConditionExpression {
        return new ConditionExpression(new AttributeType(new AttributeOperand(attr), type))
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

    private constructor(private readonly cond: BaseCondition) {}

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
     * Resolves the condition to an object.
     */
    public resolve(builder: TemplateBuilder): ResolvedCondition {
        return this.cond.resolve(builder)
    }
}
