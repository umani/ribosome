import { MethodWrapper } from "../vtl/method-wrapper"
import { TemplateBuilder } from "../builder"
import { Expression, Reference } from "../vtl/reference"

export class DynamoDBUtils {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "util.dynamodb")
    }

    public toDynamoDB(obj: Expression): Reference {
        return this.invoker.apply("toDynamoDB", obj)
    }

    public toDynamoDBJson(obj: Expression): Reference {
        return this.invoker.apply("toDynamoDBJson", obj)
    }

    public toString(obj: Expression): Reference {
        return this.invoker.apply("toString", obj)
    }

    public toStringJson(obj: Expression): Reference {
        return this.invoker.apply("toStringJson", obj)
    }

    public toStringSet(obj: Expression): Reference {
        return this.invoker.apply("toStringSet", obj)
    }

    public toStringSetJson(obj: Expression): Reference {
        return this.invoker.apply("toStringSetJson", obj)
    }

    public toNumber(obj: Expression): Reference {
        return this.invoker.apply("toNumber", obj)
    }

    public toNumberJson(obj: Expression): Reference {
        return this.invoker.apply("toNumberJson", obj)
    }

    public toNumberSet(obj: Expression): Reference {
        return this.invoker.apply("toNumberSet", obj)
    }

    public toNumberSetJson(obj: Expression): Reference {
        return this.invoker.apply("toNumberSetJson", obj)
    }

    public toBinary(obj: Expression): Reference {
        return this.invoker.apply("toBinary", obj)
    }

    public toBinaryJson(obj: Expression): Reference {
        return this.invoker.apply("toBinaryJson", obj)
    }

    public toBinarySet(obj: Expression): Reference {
        return this.invoker.apply("toBinarySet", obj)
    }

    public toBinarySetJson(obj: Expression): Reference {
        return this.invoker.apply("toBinarySetJson", obj)
    }

    public toBoolean(obj: Expression): Reference {
        return this.invoker.apply("toBoolean", obj)
    }

    public toBooleanJson(obj: Expression): Reference {
        return this.invoker.apply("toBooleanJson", obj)
    }

    public toNull(obj: Expression): Reference {
        return this.invoker.apply("toNull", obj)
    }

    public toNullJson(obj: Expression): Reference {
        return this.invoker.apply("toNullJson", obj)
    }

    public toList(obj: Expression): Reference {
        return this.invoker.apply("toList", obj)
    }

    public toListJson(obj: Expression): Reference {
        return this.invoker.apply("toListJson", obj)
    }

    public toMap(obj: Expression): Reference {
        return this.invoker.apply("toMap", obj)
    }

    public toMapJson(obj: Expression): Reference {
        return this.invoker.apply("toMapJson", obj)
    }

    public toMapValues(obj: Expression): Reference {
        return this.invoker.apply("toMapValues", obj)
    }

    public toMapValuesJson(obj: Expression): Reference {
        return this.invoker.apply("toMapValuesJson", obj)
    }
}
