import { Api } from "./api"

test("Simple template", () => {
    const t = Api.requestTemplate(r => {
        const id = r.variable("ENTITY#" + r.util.autoId())
        r.if(r.ctx.identity.groups.contains(r.literal("admins")).not(), () => {
            r.util.unauthorized()
        })
        r.dynamoDb.putItem({
            key: {
                pk: id,
                sk: r.ctx.arg("arg"),
            },
        })
    })
    expect(t).toBe(`#set($var0 = "ENTITY#\${$util.autoId()}")
#set($var1 = false)
#foreach(\${var2} in \${ctx.identity.claims.get("cognito:groups")})
  #{if} ((\${var2} == "admins"))
    #set($var1 = true)
  #{end}
#end
#{if} (!\${var1})
  \${$util.unauthorized()}
#{end}
{
  "version": "2017-02-28",
  "operation": "PutItem",
  "key": {
    "pk": \${var0},
    "sk": \${ctx.args.arg}
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
  "id": \${ctx.args.id}
  "meta": "stuff"
  "upperMeta": \${ctx.args.meta.toUpperCase()}
})
#set($var1 = { })
$!{var1.put("id","first value")}
#set($var0.myProperty = "ABC")
#set($var0.arrProperty = ["Write","Some","GraphQL"])
#set($var0.jsonProperty = {
  "AppSync": "Offline and Realtime"
  "Cognito": "AuthN and AuthZ"
})
#set($var2 = "Jeff")
$!{var0.put("Firstname",\${var2})}
#set($var3 = "This is a long string, I want to pull out everything after the comma")
#set($var4 = \${var3.indexOf(",")})
#set($var4 = (\${var4} + 2))
#set($var5 = \${var3.substring(\${var4})})
$!{var0.put("substring",\${var5})}
#foreach(\${var6} in [0 .. 5])
  $!{var0.put(\${var6},"\${var6}foo")}
#end`)
})
