// Implements the helpers in AppSync's $context.identity

import { TemplateBuilder } from "../builder"
import { Reference, Method, MapVariableOrProperty } from "../vtl/reference"
import { MappingTemplate } from "../mapping-template"
import { indent } from "../indent"

export class Groups extends Method {
    public constructor(builder: TemplateBuilder) {
        super(builder, "ctx.identity.claims", "get", [builder.literal("cognito:groups")])
    }

    public contains(group: Reference): Reference {
        const result = this.builder.variable()
        result.assign(this.builder.literal(false))
        this.builder.foreach(this, it => {
            this.builder.if(it.eq(group), () => {
                result.assign(this.builder.literal(true))
            })
        })
        return result
    }
}

export class Identity {
    public constructor(private readonly builder: TemplateBuilder) {}

    public readonly username = MappingTemplate.from((_, i) => indent(i, "$ctx.identity.username"))

    public readonly sub = MappingTemplate.from((_, i) => indent(i, "$ctx.identity.sub"))

    public claims(): MapVariableOrProperty {
        return new MapVariableOrProperty(this.builder, "ctx.identity.claims")
    }

    public claim(c: Reference): Reference {
        return this.builder.literal(`$ctx.identity.claims.${c}`)
    }

    public accountId(): Reference {
        return this.builder.literal("$ctx.identity.accountId")
    }

    public readonly groups = new Groups(this.builder)
}
