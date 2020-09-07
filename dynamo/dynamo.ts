import { MappingTemplateVersion } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { Reference, Expression, Method } from "../vtl/reference"
import { ConditionExpression, Query } from "./dynamo-conditions"
import { DynamoDBUtils } from "../appsync/dynamodb-utils"
import { Util } from "../appsync/util"
import { Update, UpdateExpression } from "./dynamo-update"

export interface PrimaryKey {
    readonly [k: string]: Expression
}

export interface AttributeValues {
    // Must be a map. Again, hard to verify types.
    readonly projecting?: Reference
    readonly values: {
        readonly [k: string]: Expression
    }
}

export interface PutItemProps {
    key: PrimaryKey
    attributes?: AttributeValues
    cond?: ConditionExpression
}

export interface UpdateItemProps {
    key: PrimaryKey
    update: UpdateExpression
    cond?: ConditionExpression
}

export interface GetItemProps {
    key: PrimaryKey
}

export interface DeleteItemProps {
    key: PrimaryKey
    cond?: ConditionExpression
}

export interface TransactWriteItemProps {
    tableName: string
    key: PrimaryKey
    returnValuesOnConditionCheckFailure?: boolean
    cond?: ConditionExpression
}

export interface TransactPutItemProps extends TransactWriteItemProps {
    attributes?: AttributeValues
}

export interface TransactWriteItems {
    readonly puts?: TransactPutItemProps[]
    readonly deletes?: TransactWriteItemProps[]
}

export class DynamoDbRequestUtils {
    public constructor(readonly builder: TemplateBuilder) {}

    private keyToDynamoJson(pk: PrimaryKey): PrimaryKey {
        return Object.entries(pk).reduce((acc, [k, v]) => {
            if (!(v instanceof Method) || !v.name.includes("util.dynamodb")) {
                v = new DynamoDBUtils(this.builder).toDynamoDBJson(v)
            }
            return { ...acc, [k]: v }
        }, {} as PrimaryKey)
    }

    private prepareAttributes(attrs?: AttributeValues): Reference | undefined {
        if (!attrs) {
            return undefined
        }
        const values = this.builder.map(attrs.projecting)
        Object.entries(attrs.values).forEach(([k, v]) => new Util(this.builder).quiet(values?.put(k, v.consume())))
        return new DynamoDBUtils(this.builder).toMapValuesJson(values)
    }

    public putItem(props: PutItemProps): void {
        const values = this.prepareAttributes(props.attributes)
        this.builder.literal({
            operation: "PutItem",
            version: MappingTemplateVersion.V1,
            key: this.keyToDynamoJson(props.key),
            ...(values ? { attributeValues: values } : {}),
            ...(props.cond ? { condition: props.cond.resolve(this.builder) } : {}),
        })
    }

    public updateItem(props: UpdateItemProps): void {
        this.builder.literal({
            operation: "UpdateItem",
            version: MappingTemplateVersion.V1,
            key: this.keyToDynamoJson(props.key),
            update: new Update(props.update).resolve(this.builder),
            ...(props.cond ? { condition: props.cond.resolve(this.builder) } : {}),
        })
    }

    public getItem(props: GetItemProps): void {
        this.builder.literal({
            operation: "GetItem",
            version: MappingTemplateVersion.V1,
            key: this.keyToDynamoJson(props.key),
        })
    }

    public deleteItem(props: DeleteItemProps): void {
        this.builder.literal({
            operation: "DeleteItem",
            version: MappingTemplateVersion.V1,
            key: this.keyToDynamoJson(props.key),
            ...(props.cond ? { condition: props.cond.resolve(this.builder) } : {}),
        })
    }

    public query(q: Query): void {
        this.builder.literal({
            operation: "Query",
            version: MappingTemplateVersion.V1,
            query: q.resolve(this.builder),
        })
    }

    public transactWrite(tx: TransactWriteItems): void {
        const common = (item: TransactWriteItemProps): Record<string, unknown> => ({
            table: item.tableName,
            key: this.keyToDynamoJson(item.key),
            ...(item.cond
                ? {
                      condition: {
                          returnValuesOnConditionCheckFailure: item.returnValuesOnConditionCheckFailure,
                          ...item.cond.resolve(this.builder),
                      },
                  }
                : {}),
        })
        const puts = (tx.puts || []).map(p => {
            const values = this.prepareAttributes(p.attributes)
            return this.builder.literal({
                ...common(p),
                operation: "PutItem",
                attributeValues: values,
            })
        })
        const deletes = (tx.deletes || []).map(d =>
            this.builder.literal({
                ...common(d),
                operation: "DeleteItem",
            }),
        )
        this.builder.literal({
            version: MappingTemplateVersion.V2,
            operation: "TransactWriteItems",
            transactItems: [...puts, ...deletes],
        })
    }
}
