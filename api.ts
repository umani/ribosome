import { RequestTemplate, ResponseTemplate } from "./request-response-template"
import { MappingTemplateVersion } from "./mapping-template"

export class Api {
    private static globalVersion = MappingTemplateVersion.V1

    public static setGlobalVersion(v: MappingTemplateVersion): void {
        this.globalVersion = v
    }

    public static requestTemplate(
        f: (r: RequestTemplate) => void,
        v: MappingTemplateVersion = Api.globalVersion,
    ): string {
        const r = new RequestTemplate()
        f(r)
        return r.renderTemplate(v, 0)
    }

    public static responseTemplate(
        f: (r: ResponseTemplate) => void,
        v: MappingTemplateVersion = Api.globalVersion,
    ): string {
        const r = new ResponseTemplate()
        f(r)
        return r.renderTemplate(v, 0)
    }
}
