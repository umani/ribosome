import { Reference } from "../vtl/reference"
import { TemplateBuilder } from "../builder"

export class ErrorResult extends Reference {
    public constructor(builder: TemplateBuilder, self: Reference) {
        super(builder, self.name)
        self.consume()
    }

    public get message(): Reference {
        return this.access("message")
    }

    public get type(): Reference {
        return this.access("type")
    }
}
