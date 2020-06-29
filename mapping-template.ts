export abstract class MappingTemplate {
    public abstract renderTemplate(): string

    public static fromString(str: string): MappingTemplate {
        return new (class extends MappingTemplate {
            public renderTemplate(): string {
                return str
            }
        })()
    }
}
