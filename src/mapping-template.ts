export enum MappingTemplateVersion {
    V1 = "2017-02-28",
    V2 = "2018-05-29",
}

export abstract class MappingTemplate {
    public abstract renderTemplate(indentation: number): string

    public static from(mt: (indent: number) => string): MappingTemplate {
        return new (class extends MappingTemplate {
            public renderTemplate(indent: number): string {
                return mt(indent)
            }
        })()
    }
}
