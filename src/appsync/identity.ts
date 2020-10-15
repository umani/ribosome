// Implements the helpers in AppSync's $context.identity

import { TemplateBuilder } from "../builder"
import { MapReference, Reference } from "../vtl/reference"

// TODO: should be Array Reference
export class Groups extends Reference {
    public constructor(builder: TemplateBuilder, private readonly groups: Reference) {
        super(builder, "groups")
        groups.consume()
    }

    public contains(group: unknown): Reference {
        const result = this.builder.variable(false)
        this.builder.foreach(this, it => {
            this.builder.if(it.eq(group), () => {
                result.assign(this.builder.literal(true))
            })
        })
        return result
    }

    public renderTemplate(i: number): string {
        return this.groups.renderTemplate(i)
    }
}

export class Identity {
    public constructor(private readonly builder: TemplateBuilder, private readonly identity: Reference) {}

    public get username(): Reference {
        return this.identity.accessMap("username")
    }

    public get sub(): Reference {
        return this.identity.access("sub")
    }

    public get accountId(): Reference {
        return this.identity.access("accountId")
    }

    public get claims(): MapReference {
        return this.identity.accessMap("claims")
    }

    public claim(c: Reference): Reference {
        return this.claims.get(c)
    }

    public get groups(): Groups {
        return new Groups(this.builder, this.claims.get("cognito:groups"))
    }
}
