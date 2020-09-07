import {
    OperandCollector,
    ExpressionNamesAliasGenerator,
    ExpressionValuesAliasGenerator,
    Attribute,
    IOperand,
} from "./dynamo-conditions"
import { Expression } from "vtl/reference"
import { TemplateBuilder } from "builder"

/**
 * SetOperator is the base class for the increment and decrement
 * operators that can be used in a Set Update Expression.
 */
class SetOperator implements Attribute {
    constructor(private readonly left: IOperand, private readonly operator: string, private readonly right: IOperand) {}

    public _resolve(collector: OperandCollector): string {
        return `${this.left._resolve(collector)}${this.operator}${this.right._resolve(collector)}`
    }
}

/**
 * Add is an operator in a Set Update Expression that
 * increments an existing numeric attribute.
 */
class Add extends SetOperator {
    constructor(left: IOperand, right: IOperand) {
        super(left, "+", right)
    }
}

/**
 * Subtract is an operator in a Set Update Expression that
 * decrements an existing numeric attribute.
 */
class Subtract extends SetOperator {
    constructor(left: IOperand, right: IOperand) {
        super(left, "-", right)
    }
}

/**
 * SetFunction is the base class for the function
 * operators that can be used in a Set Update Expression.
 */
class SetFunction implements Attribute {
    constructor(
        private readonly functionName: string,
        private readonly left: IOperand,
        private readonly right: IOperand,
    ) {}

    public _resolve(collector: OperandCollector): string {
        return `${this.functionName}(${this.left._resolve(collector)},${this.right._resolve(collector)})`
    }
}

/**
 * IfNotExists is a function that can be used in a Set Update Expression.
 * If the item does not contain an attribute at the specified path,
 * if_not_exists evaluates to value; otherwise, it evaluates to path.
 */
class IfNotExists extends SetFunction {
    constructor(attr: Attribute, value: Expression) {
        super("if_not_exists", attr, value)
    }
}

/**
 * ListAppend is a function that can be used in a Set Update Expression.
 * The function takes two lists as input and appends all elements from list2 to list1.
 */
class ListAppend extends SetFunction {
    constructor(list1: IOperand, list2: IOperand) {
        super("list_append", list1, list2)
    }
}

interface ResolvedExpression {
    readonly expression: string
    readonly expressionNames?: Record<string, string>
    readonly expressionValues?: Record<string, Expression>
}

/**
 * BaseAction is a base class for Update Expression actions.
 * They can be SET, REMOVE, ADD and DELETE.
 */
abstract class BaseAction {
    abstract resolveAction(collector: OperandCollector): string

    public resolve(builder: TemplateBuilder): ResolvedExpression {
        const collector: OperandCollector = {
            expressionNames: new ExpressionNamesAliasGenerator(),
            expressionValues: new ExpressionValuesAliasGenerator(builder),
        }

        const expression = this.resolveAction(collector)

        return {
            expressionNames: collector.expressionNames.result,
            expressionValues: collector.expressionValues.result,
            expression,
        }
    }
}

/**
 * SetAction class represents the SET action, which can be used in a Update Expression.
 * This action takes as input a path (Attribute) and a value. A value can be a path,
 * a operation, a function or a literal value, represented by the base IOperand interface.
 */
type SetActionInput = { attribute: Attribute; value: IOperand }
class SetAction extends BaseAction {
    constructor(private readonly attr: SetActionInput[]) {
        super()
    }

    resolveAction(collector: OperandCollector): string {
        return `SET ${this.attr
            .map(({ attribute, value }) => `${attribute._resolve(collector)}=${value._resolve(collector)}`)
            .join(", ")}`
    }
}

/**
 * RemoveAction class represents the REMOVE action, which can be used in a Update Expression.
 * This action takes as input an array of Attributes to be removed.
 */
class RemoveAction extends BaseAction {
    constructor(private readonly attrs: Attribute[]) {
        super()
    }

    resolveAction(collector: OperandCollector): string {
        return `REMOVE ${this.attrs.map(attr => attr._resolve(collector)).join(", ")}`
    }
}

/**
 * DeleteAction class represents the DELETE action, which can be used in a Update Expression.
 * The DELETE action differentiates from the REMOVE action because it only deletes elements in a
 * Set. This action takes as input an array of Expressions.
 */
class DeleteAction extends BaseAction {
    constructor(private readonly values: Expression[]) {
        super()
    }

    resolveAction(collector: OperandCollector): string {
        return `DELETE ${this.values.map(value => value._resolve(collector)).join(", ")}`
    }
}

/**
 * Utility interface for the Set Expression to make it easier to declare operators.
 */
interface ISetOperation {
    attribute: Attribute
    value?: IOperand

    add?: {
        left: IOperand
        right: IOperand
    }

    sub?: {
        left: IOperand
        right: IOperand
    }

    if_not_exists?: {
        attribute?: Attribute
        value: Expression
    }

    list_append?: {
        list1: IOperand
        list2: IOperand
    }
}

/**
 * Factory class for the Set Expression, part of the Update Expression.
 * Takes ISetOperation as input and parses it to a correspondent operator or function class.
 */
class SetExpression {
    constructor(private readonly props: ISetOperation) {}

    private resolveValue(): IOperand | undefined {
        if (this.props.add !== undefined) {
            return new Add(this.props.add.left, this.props.add.right)
        }
        if (this.props.sub !== undefined) {
            return new Subtract(this.props.sub.left, this.props.sub.right)
        }
        if (this.props.if_not_exists !== undefined) {
            return new IfNotExists(
                this.props.if_not_exists.attribute ? this.props.if_not_exists.attribute : this.props.attribute,
                this.props.if_not_exists.value,
            )
        }
        if (this.props.list_append !== undefined) {
            return new ListAppend(this.props.list_append.list1, this.props.list_append.list2)
        }
        return this.props.value
    }

    public resolve(): { attribute: Attribute; value: IOperand | undefined } {
        return {
            attribute: this.props.attribute,
            value: this.resolveValue(),
        }
    }

    static resolveAll(props: ISetOperation[]): SetActionInput[] {
        return props
            .map(prop => new SetExpression(prop).resolve())
            .filter(prop => prop.value !== undefined) as SetActionInput[]
    }
}

/**
 * Interface that represents an Update Expression and its actions.
 */
export interface UpdateExpression {
    set?: ISetOperation[]
    remove?: Attribute[]
    delete?: Expression[]
}

/**
 * The Update class takes a UpdateExpression and parses its
 * given actions to a proper DynamoDB UpdateItem input.
 */
export class Update {
    constructor(private readonly expression: UpdateExpression) {}

    public resolve(builder: TemplateBuilder): ResolvedExpression {
        return Object.entries(this.expression)
            .map(([action, props]) =>
                action === "set"
                    ? new SetAction(SetExpression.resolveAll(props as NonNullable<UpdateExpression["set"]>)).resolve(
                          builder,
                      )
                    : action === "remove"
                    ? new RemoveAction(props as NonNullable<UpdateExpression["remove"]>).resolve(builder)
                    : new DeleteAction(props as NonNullable<UpdateExpression["delete"]>).resolve(builder),
            )
            .reduce(
                (prev, cur) => ({
                    expression: (prev.expression + " " + cur.expression).trim(),
                    expressionNames: { ...prev.expressionNames, ...cur.expressionNames },
                    expressionValues: { ...prev.expressionValues, ...cur.expressionValues },
                }),
                { expression: "" },
            )
    }
}
