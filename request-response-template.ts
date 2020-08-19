import { Util } from "./appsync/util"
import { Context, ResultContext } from "./appsync/context"
import { TemplateBuilder } from "./builder"
import { DynamoDbRequestUtils } from "./dynamo/dynamo"

export abstract class RequestResponseTemplate extends TemplateBuilder {
    readonly util = new Util(this)
}

export class RequestTemplate extends RequestResponseTemplate {
    readonly dynamoDb = new DynamoDbRequestUtils(this)
    readonly ctx = new Context(this)

    public invoke(payload: unknown): void {
        this.literal({
            version: this.version,
            operation: "Invoke",
            payload,
        })
    }
}

export class ResponseTemplate extends RequestResponseTemplate {
    readonly ctx = new ResultContext(this)
}
