import { Util } from "./util"
import { Context } from "./Context"
import { TemplateBuilder } from "./builder"
import { DynamoDbRequestUtils } from "./dynamo"

export abstract class RequestResponseTemplate extends TemplateBuilder {
    readonly ctx = new Context(this)
    readonly util = new Util()
}

export class RequestTemplate extends RequestResponseTemplate {
    // Contains request-specific utilities like DynamoDB actions
    readonly dynamoDb = new DynamoDbRequestUtils(this)
}

export declare class ResponseTemplate extends RequestResponseTemplate {
    // Contains response-specific utilities like the result
}
