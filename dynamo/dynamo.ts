import { MappingTemplate, MappingTemplateVersion } from "../mapping-template"
import { TemplateBuilder } from "../builder"
import { Reference } from "../vtl/reference"
import { ConditionExpression } from "./dynamo-conditions"
import { indent } from "../indent"

export interface PrimaryKey {
    readonly [k: string]: Reference
}

export interface AttributeValues {
    // Must be a map. Again, hard to verify types.
    readonly projecting?: Reference
    readonly values: {
        readonly [k: string]: Reference
    }
}

function renderKey(i: number, pk: PrimaryKey): string {
    return [
        indent(i, `"key": {`),
        Object.entries(pk)
            .map(([k, v]) => indent(i + 2, `"${k}": ${v}`))
            .join(",\n"),
        indent(i, "}"),
    ].join("\n")
}

export interface PutItemProps {
    key: PrimaryKey
    attributes?: AttributeValues
    cond?: ConditionExpression
}

export interface GetItemProps {
    key: PrimaryKey
}

export class DynamoDbRequestUtils {
    public constructor(readonly builder: TemplateBuilder) {}

    private operation(
        op: string,
        key: PrimaryKey,
        lines: (version: MappingTemplateVersion, indentation: number) => string[],
    ): void {
        this.builder.appendTemplate(
            MappingTemplate.from((v, i) => {
                return [
                    indent(i, "{"),
                    [
                        indent(i + 2, `"version": ${JSON.stringify(v)}`),
                        indent(i + 2, `"operation": "${op}"`),
                        renderKey(i + 2, key),
                        ...lines(v, i),
                    ]
                        .filter(s => s.length > 0)
                        .join(",\n"),
                    indent(i, "}"),
                ].join("\n")
            }),
        )
    }

    public putItem(props: PutItemProps): void {
        const values = this.builder.map()
        if (props.attributes) {
            if (props.attributes.projecting) {
                values.assign(props.attributes.projecting)
            }
            Object.entries(props.attributes.values).forEach(([k, v]) => values.put(k, v))
        }
        this.operation("PutItem", props.key, (v, i) => [
            props.attributes
                ? indent(i + 2, `"attributeValues": $util.dynamodb.toMapValuesJson(${values.renderTemplate(v, 0)})`)
                : "",
            props.cond ? props.cond.renderTemplate(v, i + 2) : "",
        ])
    }

    public getItem(props: GetItemProps): void {
        this.operation("GetItem", props.key, () => [])
    }
}
