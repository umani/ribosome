import { TemplateBuilder } from "../builder"
import { Literal, Reference } from "../vtl/reference"
import { Util } from "./util"

export class DataSource extends Literal {
    constructor(builder: TemplateBuilder, value: Record<string, unknown>) {
        super(builder, value)
    }

    public toJson(): Reference {
        return new Util(this.builder).toJson(this)
    }
}