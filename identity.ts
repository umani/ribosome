// Implements the helpers in AppSync's $context.identity

import { MappingTemplate } from "./mapping-template"
import { TemplateBuilder } from "./builder"
import { ForEach, If, Assign } from "./statements"

export class Groups {
    public constructor(private readonly builder: TemplateBuilder) {}

    public contains(group: string): MappingTemplate {
        const result = this.builder.variable("false")
        return new ForEach(MappingTemplate.fromString('$ctx.identity.claims.get("cognito:groups")'), v => [
            new If(MappingTemplate.fromString(`${group} == ${v}`), [
                new Assign(result, MappingTemplate.fromString("true")),
            ]),
        ])
    }
}

export class Identity {
    public constructor(private readonly builder: TemplateBuilder) {}

    public readonly username = MappingTemplate.fromString("$ctx.identity.username")

    public readonly groups = new Groups(this.builder)
}
