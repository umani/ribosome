import { MappingTemplate } from "./mapping-template"
import { TemplateBuilder } from "builder"

declare class PrimaryKey {}
declare class AttributeValues {}
declare class ConditionExpression {}

export interface PutItemProps {
    key: PrimaryKey
    values?: AttributeValues
    cond?: ConditionExpression
}

export class PutItemTemplate extends MappingTemplate {
    public constructor(readonly builder: TemplateBuilder, readonly props: PutItemProps) {
        // Can use the builder to create variables, etc.
        super()
    }

    public renderTemplate(): string {
        return ""
    }
}

export class DynamoDbRequestUtils {
    public constructor(readonly builder: TemplateBuilder) {}

    public putItem(props: PutItemProps): MappingTemplate {
        return new PutItemTemplate(this.builder, props)
    }
}
