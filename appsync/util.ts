// Implements the helpers in AppSync's $util

import { Reference } from "../vtl/reference"
import { TemplateBuilder } from "../builder"
import { MethodWrapper } from "../vtl/method-wrapper"
import { Time } from "./time"

// FIXME: It would be great if we could validate types, but that would require
// being able to recover them from method calls. Maybe if we assume the type
// system is restricted to Maps and ArrayLists we can list all of the available
// methods and their return types, but that should be future work.

export class List {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "$util.list")
    }

    public copyAndRetainAll(toCopy: Reference, toKeep: Reference): Reference {
        return this.invoker.apply("copyAndRetainAll", toCopy, toKeep)
    }

    public copyAndRecopyAndRemoveAlltainAll(toCopy: Reference, toKeep: Reference): Reference {
        return this.invoker.apply("copyAndRemoveAll", toCopy, toKeep)
    }
}

export class Map {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "$util.map")
    }

    public copyAndRetainAllKeys(toCopy: Reference, toKeep: Reference): Reference {
        return this.invoker.apply("copyAndRetainAllKeys", toCopy, toKeep)
    }

    public copyAndRemoveAllKeys(toCopy: Reference, toKeep: Reference): Reference {
        return this.invoker.apply("copyAndRemoveAllKeys", toCopy, toKeep)
    }
}

export class Util {
    private readonly invoker: MethodWrapper

    public readonly time: Time
    public readonly list: List
    public readonly map: Map

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "$util")
        this.time = new Time(builder)
        this.list = new List(builder)
        this.map = new Map(builder)
    }

    public appendError(msg: Reference, errorType?: Reference, data?: Reference, errorInfo?: Reference): void {
        this.invoker.apply("appendError", msg, errorType, data, errorInfo).consume()
    }

    public autoId(): Reference {
        return this.invoker.apply("autoId")
    }

    public base64Encode(arg: Reference): Reference {
        return this.invoker.apply("base64Encode", arg)
    }

    public base64Decode(arg: Reference): Reference {
        return this.invoker.apply("base64Decode", arg)
    }

    public defaultIfNull(arg: Reference, d: Reference): Reference {
        return this.invoker.apply("defaultIfNull", arg, d)
    }

    public defaultIfNullOrEmpty(arg: Reference, d: Reference): Reference {
        return this.invoker.apply("defaultIfNullOrEmpty", arg, d)
    }

    public defaultIfNullOrBlank(arg: Reference, d: Reference): Reference {
        return this.invoker.apply("defaultIfNullOrBlank", arg, d)
    }

    public error(msg: Reference, errorType?: Reference, data?: Reference, errorInfo?: Reference): void {
        this.invoker.apply("error", msg, errorType, data, errorInfo).consume()
    }

    public escapeJavaScript(arg: Reference): Reference {
        return this.invoker.apply("escapeJavaScript", arg)
    }

    public isNull(arg: Reference): Reference {
        return this.invoker.apply("isNull", arg)
    }

    public isNullOrEmpty(arg: Reference): Reference {
        return this.invoker.apply("isNullOrEmpty", arg)
    }

    public isNullOrBlank(arg: Reference): Reference {
        return this.invoker.apply("isNullOrBlank", arg)
    }

    public isNumber(arg: Reference): Reference {
        return this.invoker.apply("isNumber", arg)
    }

    public isString(arg: Reference): Reference {
        return this.invoker.apply("isString", arg)
    }

    public isBoolean(arg: Reference): Reference {
        return this.invoker.apply("isBoolean", arg)
    }

    public isList(arg: Reference): Reference {
        return this.invoker.apply("isList", arg)
    }

    public isMap(arg: Reference): Reference {
        return this.invoker.apply("isMap", arg)
    }

    public matches(arg1: Reference, arg2: Reference): Reference {
        return this.invoker.apply("matches", arg1, arg2)
    }

    public parseJson(arg: Reference): Reference {
        return this.invoker.apply("parseJson", arg)
    }

    public quiet(r: Reference): void {
        r.quiet()
    }

    public toJson(arg: Reference): Reference {
        return this.invoker.apply("toJson", arg)
    }

    public typeOf(arg: Reference): Reference {
        return this.invoker.apply("typeOf", arg)
    }

    public unauthorized(): void {
        this.invoker.apply("unauthorized").consume()
    }

    public urlEncode(arg: Reference): Reference {
        return this.invoker.apply("urlEncode", arg)
    }

    public urlDecode(arg: Reference): Reference {
        return this.invoker.apply("urlDecode", arg)
    }

    public validate(cond: Reference, msg?: Reference, errorType?: Reference, data?: Reference): Reference {
        return this.invoker.apply("validate", cond, msg, errorType, data)
    }
}
