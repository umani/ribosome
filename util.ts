// Implements the helpers in AppSync's $util

import { MappingTemplate } from "./mapping-template"

export class Util {
    public autoId(): MappingTemplate {
        return MappingTemplate.fromString("$utils.autoId()")
    }

    public unauthorized(): MappingTemplate {
        return MappingTemplate.fromString("$utils.unauthorized()")
    }
}
