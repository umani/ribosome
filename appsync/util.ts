// Implements the helpers in AppSync's $util

import { Expression } from "../vtl/reference"
import { TemplateBuilder } from "../builder"
import { MethodWrapper } from "../vtl/method-wrapper"
import { Time } from "./time"
import { DynamoDBUtils } from "./dynamodb-utils"

// FIXME: It would be great if we could validate types, but that would require
// being able to recover them from method calls. Maybe if we assume the type
// system is restricted to Maps and ArrayLists we can list all of the available
// methods and their return types, but that should be future work.

export class List {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "$util.list")
    }

    public copyAndRetainAll(toCopy: Expression, toKeep: Expression): Expression {
        return this.invoker.apply("copyAndRetainAll", toCopy, toKeep)
    }

    public copyAndRecopyAndRemoveAlltainAll(toCopy: Expression, toKeep: Expression): Expression {
        return this.invoker.apply("copyAndRemoveAll", toCopy, toKeep)
    }
}

export class Map {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "$util.map")
    }

    public copyAndRetainAllKeys(toCopy: Expression, toKeep: Expression): Expression {
        return this.invoker.apply("copyAndRetainAllKeys", toCopy, toKeep)
    }

    public copyAndRemoveAllKeys(toCopy: Expression, toKeep: Expression): Expression {
        return this.invoker.apply("copyAndRemoveAllKeys", toCopy, toKeep)
    }
}

export class Util {
    private readonly invoker: MethodWrapper

    public readonly time: Time
    public readonly list: List
    public readonly map: Map
    public readonly dynamodb: DynamoDBUtils

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "util")
        this.time = new Time(builder)
        this.list = new List(builder)
        this.map = new Map(builder)
        this.dynamodb = new DynamoDBUtils(builder)
    }

    public appendError(msg: Expression, errorType?: Expression, data?: Expression, errorInfo?: Expression): void {
        this.invoker.apply("appendError", msg, errorType, data, errorInfo)
    }

    public autoId(): Expression {
        return this.invoker.apply("autoId")
    }

    public base64Encode(arg: Expression): Expression {
        return this.invoker.apply("base64Encode", arg)
    }

    public base64Decode(arg: Expression): Expression {
        return this.invoker.apply("base64Decode", arg)
    }

    public defaultIfNull(arg: Expression, d: Expression): Expression {
        return this.invoker.apply("defaultIfNull", arg, d)
    }

    public defaultIfNullOrEmpty(arg: Expression, d: Expression): Expression {
        return this.invoker.apply("defaultIfNullOrEmpty", arg, d)
    }

    public defaultIfNullOrBlank(arg: Expression, d: Expression): Expression {
        return this.invoker.apply("defaultIfNullOrBlank", arg, d)
    }

    public error(msg: Expression, errorType?: Expression, data?: Expression, errorInfo?: Expression): void {
        this.invoker.apply("error", msg, errorType, data, errorInfo)
    }

    public escapeJavaScript(arg: Expression): Expression {
        return this.invoker.apply("escapeJavaScript", arg)
    }

    public isNull(arg: Expression): Expression {
        return this.invoker.apply("isNull", arg)
    }

    public isNullOrEmpty(arg: Expression): Expression {
        return this.invoker.apply("isNullOrEmpty", arg)
    }

    public isNullOrBlank(arg: Expression): Expression {
        return this.invoker.apply("isNullOrBlank", arg)
    }

    public isNumber(arg: Expression): Expression {
        return this.invoker.apply("isNumber", arg)
    }

    public isString(arg: Expression): Expression {
        return this.invoker.apply("isString", arg)
    }

    public isBoolean(arg: Expression): Expression {
        return this.invoker.apply("isBoolean", arg)
    }

    public isList(arg: Expression): Expression {
        return this.invoker.apply("isList", arg)
    }

    public isMap(arg: Expression): Expression {
        return this.invoker.apply("isMap", arg)
    }

    public matches(arg1: Expression, arg2: Expression): Expression {
        return this.invoker.apply("matches", arg1, arg2)
    }

    public parseJson(arg: Expression): Expression {
        return this.invoker.apply("parseJson", arg)
    }

    public quiet(r: Expression): void {
        this.invoker.apply("qr", r)
    }

    public toJson(arg: Expression): Expression {
        return this.invoker.apply("toJson", arg)
    }

    public typeOf(arg: Expression): Expression {
        return this.invoker.apply("typeOf", arg)
    }

    public unauthorized(): void {
        this.invoker.apply("unauthorized")
    }

    public urlEncode(arg: Expression): Expression {
        return this.invoker.apply("urlEncode", arg)
    }

    public urlDecode(arg: Expression): Expression {
        return this.invoker.apply("urlDecode", arg)
    }

    public validate(cond: Expression, msg?: Expression, errorType?: Expression, data?: Expression): Expression {
        return this.invoker.apply("validate", cond, msg, errorType, data)
    }
}
