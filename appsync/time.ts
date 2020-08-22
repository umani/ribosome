import { MethodWrapper } from "../vtl/method-wrapper"
import { TemplateBuilder } from "../builder"
import { Reference } from "../vtl/reference"

export class Time {
    private readonly invoker: MethodWrapper

    public constructor(builder: TemplateBuilder) {
        this.invoker = new MethodWrapper(builder, "util.time")
    }

    public nowISO8601(): Reference {
        return this.invoker.apply("nowISO8601")
    }

    public nowEpochSeconds(): Reference {
        return this.invoker.apply("nowEpochSeconds")
    }

    public nowEpochMilliSeconds(): Reference {
        return this.invoker.apply("nowEpochMilliSeconds")
    }

    public nowFormatted(format: Reference, timeZone?: Reference): Reference {
        return this.invoker.apply("nowFormatted", format, timeZone)
    }

    public parseFormattedToEpochMilliSeconds(timestamp: Reference, format: Reference, timeZone?: Reference): Reference {
        return this.invoker.apply("parseFormattedToEpochMilliSeconds", timestamp, format, timeZone)
    }

    public parseISO8601ToEpochMilliSeconds(timestamp: Reference): Reference {
        return this.invoker.apply("parseISO8601ToEpochMilliSeconds", timestamp)
    }

    public epochMilliSecondsToSeconds(timestamp: Reference): Reference {
        return this.invoker.apply("epochMilliSecondsToSeconds", timestamp)
    }

    public epochMilliSecondsToISO8601(timestamp: Reference): Reference {
        return this.invoker.apply("epochMilliSecondsToISO8601", timestamp)
    }

    public epochMilliSecondsToFormatted(timestamp: Reference, format: Reference, timeZone?: Reference): Reference {
        return this.invoker.apply("epochMilliSecondsToFormatted", timestamp, format, timeZone)
    }
}
