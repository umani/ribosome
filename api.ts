import { RequestTemplate } from "./request-response-template"

export declare class Api {
    public static requestTemplate(f: (r: RequestTemplate) => void): void
}

Api.requestTemplate(r => {
    const id = r.variable(`"ENTITY#" + ${r.util.autoId()}`)
    r.unless(r.ctx.identity.groups.contains("admins"), [r.util.unauthorized()])
    return r.dynamoDb.putItem({
        key: {
            pk: id,
            sk: r.ctx.args("arg"),
        },
    })
})
