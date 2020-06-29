import { MappingTemplate } from "./mapping-template"

export class If extends MappingTemplate {
    public constructor(readonly condition: MappingTemplate, readonly statements: MappingTemplate[]) {
        super()
    }

    public renderTemplate(): string {
        return `#if(${this.condition.renderTemplate()}
            ${this.statements.map(t => t.renderTemplate()).join("\n")}
        #end`
    }
}

export class Unless extends MappingTemplate {
    public constructor(readonly condition: MappingTemplate, readonly statements: MappingTemplate[]) {
        super()
    }

    public renderTemplate(): string {
        return `#if(!${this.condition.renderTemplate()}
            ${this.statements.map(t => t.renderTemplate()).join("\n")}
        #end`
    }
}

export class ForEach extends MappingTemplate {
    private static loopVariableCounter = 0

    public constructor(
        readonly collection: MappingTemplate,
        readonly statements: (itVar: string) => MappingTemplate[],
    ) {
        super()
    }

    public renderTemplate(): string {
        const variable = `$${ForEach.loopVariableCounter++}`
        const result = `#foreach(${variable} in ${this.collection.renderTemplate()}
            ${this.statements(variable)
                .map(t => t.renderTemplate())
                .join("\n")}
        #end`
        --ForEach.loopVariableCounter
        return result
    }
}

export class Assign extends MappingTemplate {
    public constructor(readonly variable: string, readonly value: MappingTemplate) {
        super()
    }

    public renderTemplate(): string {
        return `#set(${this.variable} = ${this.value.renderTemplate()})`
    }
}
