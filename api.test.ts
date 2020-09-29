import { Api } from "./api"
import { MappingTemplateVersion } from "./mapping-template"
import { Query, ConditionExpression, Attribute, ListItem } from "./dynamo/dynamo-conditions"

test("Simple template", () => {
    const t = Api.requestTemplate(r => {
        const id = r.variable("ENTITY#" + r.util.autoId())
        r.unless(r.ctx.identity.groups.contains("admins"), () => {
            r.util.unauthorized()
        })
        r.dynamoDb.putItem({
            key: {
                pk: id,
                sk: r.ctx.arg("arg"),
            },
        })
    })
    expect(t).toBe(`#set($var0 = "ENTITY#\${util.autoId()}")
#set($var1 = false)
#{foreach}(\${var2} in \${ctx.identity.claims.get("cognito:groups")})
  #{if}((\${var2} == "admins"))
    #set($var1 = true)
  #{end}
#{end}
#{if}(!\${var1})
  \${util.unauthorized()}
#{end}
{
  "operation": "PutItem",
  "version": "2017-02-28",
  "key": {
    "pk": \${util.dynamodb.toDynamoDB(\${var0})},
    "sk": \${util.dynamodb.toDynamoDB(\${ctx.args.arg})}
  }
}`)
})

test("Documentation template", () => {
    const t = Api.requestTemplate(r => {
        const myMap = r.map({
            id: r.ctx.arg("id"),
            meta: "stuff",
            upperMeta: r.ctx.arg("meta").invoke("toUpperCase"),
        })

        const myMap2 = r.map({})
        myMap2.quiet().put("id", "first value")

        myMap.access("myProperty").assign("ABC")
        myMap.access("arrProperty").assign(["Write", "Some", "GraphQL"])
        myMap.access("jsonProperty").assign({
            AppSync: "Offline and Realtime",
            Cognito: "AuthN and AuthZ",
        })

        const firstname = r.variable("Jeff")
        myMap.quiet().put("Firstname", firstname)

        const bigstring = r.variable("This is a long string, I want to pull out everything after the comma")
        const comma = r.variable(bigstring.invoke("indexOf", ","))
        comma.assign(comma.add(2))
        const substring = r.variable(bigstring.invoke("substring", comma))
        myMap.put("substring", substring)

        const start = r.literal(0)
        const end = r.literal(5)
        r.foreach([start.to(end)], i => {
            myMap.put(i, `${i}foo`)
        })
    })

    expect(t).toBe(`#set($var0 = {
  "id": \${ctx.args.id},
  "meta": "stuff",
  "upperMeta": \${ctx.args.meta.toUpperCase()}
})
#set($var1 = { })
$!{var1.put("id", "first value")}
#set($var0.myProperty = "ABC")
#set($var0.arrProperty = ["Write", "Some", "GraphQL"])
#set($var0.jsonProperty = {
  "AppSync": "Offline and Realtime",
  "Cognito": "AuthN and AuthZ"
})
#set($var2 = "Jeff")
$!{var0.put("Firstname", \${var2})}
#set($var3 = "This is a long string, I want to pull out everything after the comma")
#set($var4 = \${var3.indexOf(",")})
#set($var4 = (\${var4} + 2))
#set($var5 = \${var3.substring(\${var4})})
$!{var0.put("substring", \${var5})}
#{foreach}(\${var6} in [0 .. 5])
  $!{var0.put(\${var6}, "\${var6}foo")}
#{end}`)
})

test("DynamoDB templates", () => {
    const put = Api.requestTemplate(r => {
        r.dynamoDb.putItem({
            key: {
                pk: r.literal("id"),
                sk: r.ctx.arg("sk"),
            },
            attributes: {
                values: {
                    attr1: r.literal(1),
                    attr2: r.ctx.stash.get("val"),
                },
            },
        })
    })
    expect(put).toBe(`#set($var0 = { })
\${util.qr(\${var0.put("attr1", 1)})}
\${util.qr(\${var0.put("attr2", \${ctx.stash.get("val")})})}
{
  "operation": "PutItem",
  "version": "2017-02-28",
  "key": {
    "pk": \${util.dynamodb.toDynamoDB("id")},
    "sk": \${util.dynamodb.toDynamoDB(\${ctx.args.sk})}
  },
  "attributeValues": \${util.dynamodb.toMapValues(\${var0})}
}`)

    const get = Api.requestTemplate(r => {
        r.dynamoDb.getItem({
            key: {
                pk: r.literal("id"),
                sk: r.ctx.arg("sk"),
            },
        })
    })
    expect(get).toBe(`{
  "operation": "GetItem",
  "version": "2017-02-28",
  "key": {
    "pk": \${util.dynamodb.toDynamoDB("id")},
    "sk": \${util.dynamodb.toDynamoDB(\${ctx.args.sk})}
  }
}`)
})

test("Unauthorized", () => {
    const t = Api.requestTemplate(r => {
        r.util.unauthorized()
    })
    expect(t).toBe("${util.unauthorized()}")
})

test("Authorize", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)
    const req = Api.requestTemplate(r => {
        r.dynamoDb.getItem({
            key: {
                PK: r.ctx.stash.get("entityId"),
                SK: r.ctx.stash.get("username"),
            },
        })
    })
    console.log(req)
    const resp = Api.responseTemplate(r => {
        r.if(r.util.isNull(r.ctx.results), () => {
            r.util.unauthorized()
        })
    })
    console.log(resp)
})

test("DeletePortfolio", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)
    const req = Api.requestTemplate(r => {
        r.dynamoDb.deleteItem({
            key: {
                PK: r.ctx.stash.get("pfId"),
                SK: r.ctx.stash.get("username"),
            },
        })
    })
    console.log(req)
    const resp = Api.responseTemplate(r => {
        r.if(r.ctx.error, () => {
            r.util.error(r.ctx.error.message, r.ctx.error.type)
        })
        r.util.toJson(r.ctx.results)
    })
    console.log(resp)
})

test("GetPortfolioById", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)
    const req = Api.requestTemplate(r => {
        r.dynamoDb.query(Query.eq("PK", r.ctx.stash.get("pfId")))
    })
    console.log(req)
    const resp = Api.responseTemplate(r => {
        r.if(r.ctx.error, () => {
            r.util.error(r.ctx.error.message, r.ctx.error.type)
        })
        r.if(r.ctx.result("items").invoke("isEmpty"), () => {
            r.util.error(r.literal("No portfolio with the specified id"), r.literal("data"), r.ctx.stash.get("pfId"))
        })
        const owner = r.variable()
        const name = r.variable()
        r.foreach(r.ctx.result("items"), item => {
            r.if(item.access("SK").invoke("startsWith", "PHOTO"), () => {
                const imgMetadata = r.variable([])
                r.foreach(item.accessMap("ImgMetadata").entrySet(), metadata => {
                    r.util.quiet(
                        imgMetadata.invoke("add", {
                            key: metadata.access("key"),
                            value: metadata.access("value"),
                        }),
                    )
                })
            })
                .elseIf(item.access("SK").invoke("startsWith", "USER"), () => {
                    owner.assign(item.access("SK"))
                })
                .else(() => {
                    name.assign(item.access("PfName"))
                })
        })
        r.literal({
            metadata: {
                id: {
                    id: r.util.toJson(r.ctx.result("items").index(0).access("PK")),
                },
            },
        })
    })
    console.log(resp)
})

test("Lambda invoke", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)
    const req = Api.requestTemplate(r => {
        r.invoke({
            key: r.ctx.stash.get("key"),
            metadata: r.util.toJson(r.ctx.stash.get("metadata")),
        })
    })
    console.log(req)
})

test("TransactPut", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)
    const req = Api.requestTemplate(r => {
        r.dynamoDb.transactWrite({
            puts: [
                {
                    tableName: "thecube",
                    key: {
                        pk: r.literal("id"),
                        sk: r.ctx.arg("sk"),
                    },
                    attributes: {
                        values: {
                            attr1: r.literal(1),
                            attr2: r.ctx.stash.get("val"),
                        },
                    },
                    cond: ConditionExpression.attributeNotExists("alias"),
                },
            ],
            updates: [
                {
                    tableName: "thecube",
                    key: {
                        pk: r.literal("id"),
                        sk: r.ctx.arg("sk"),
                    },
                    update: {
                        set: [
                            {
                                attribute: Attribute.from("bla"),
                                value: r.literal(2),
                            },
                        ],
                    },
                    cond: ConditionExpression.attributeNotExists("bla"),
                },
            ],
        })
    })
    console.log(req)
})

describe("Update", () => {
    Api.setGlobalVersion(MappingTemplateVersion.V2)

    test("set", () => {
        const req = Api.requestTemplate(r => {
            r.dynamoDb.updateItem({
                key: {
                    PK: r.ctx.stash.get("pfId"),
                    SK: r.ctx.stash.get("username"),
                },
                update: {
                    set: [
                        {
                            attribute: Attribute.from("attr1", "innerAttr1"),
                            add: {
                                left: Attribute.from("attr2"),
                                right: r.literal(2),
                            },
                        },
                        {
                            attribute: new ListItem(Attribute.from("field"), 3),
                            if_not_exists: {
                                value: r.literal(2),
                            },
                        },
                        {
                            attribute: Attribute.from("attr3"),
                            value: r.literal(2),
                        },
                        {
                            attribute: Attribute.from("attr4"),
                            list_append: {
                                list1: Attribute.from("attr4"),
                                list2: Attribute.from("list2"),
                            },
                        },
                    ],
                },
            })
        })

        console.log(req)
    })

    test("remove", () => {
        const req = Api.requestTemplate(r => {
            r.dynamoDb.updateItem({
                key: {
                    PK: r.ctx.stash.get("pfId"),
                    SK: r.ctx.stash.get("username"),
                },
                update: {
                    remove: [Attribute.from("attr1"), Attribute.from("attr2"), Attribute.from("attr3", "innerAttr3")],
                },
            })
        })

        console.log(req)
    })

    test("delete", () => {
        const req = Api.requestTemplate(r => {
            r.dynamoDb.updateItem({
                key: {
                    PK: r.ctx.stash.get("pfId"),
                    SK: r.ctx.stash.get("username"),
                },
                update: {
                    delete: [r.literal({ set: { item: 2 } })],
                },
            })
        })

        console.log(req)
    })
})

test("can modify DynamoDB operation", () => {
    const req = Api.requestTemplate(r => {
        const op = r.variable(
            r.dynamoDb.transactWrite({
                puts: [
                    {
                        tableName: "table",
                        key: {
                            PK: r.literal("id1"),
                        },
                        attributes: {
                            values: {
                                attr: r.literal("blah"),
                            },
                        },
                    },
                ],
            }),
        )
        r.if(r.literal(2).eq(r.literal(4)), () => {
            const delOp = r.variable(
                r.dynamoDb.transactWrite({
                    deletes: [
                        {
                            tableName: "table",
                            key: {
                                PK: r.literal("id2"),
                            },
                        },
                    ],
                }),
            )
            op.access("transactItems").invoke("add", delOp.access("transactItems").index(0))
        })
        r.util.toJson(op)
    })
    console.log(req)
})
