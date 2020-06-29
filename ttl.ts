class TimeUnit {
    public static readonly Seconds = new TimeUnit(1000)
    public static readonly Minutes = new TimeUnit(60_000)
    public static readonly Hours = new TimeUnit(TimeUnit.Minutes.inMillis * 60)
    public static readonly Days = new TimeUnit(TimeUnit.Hours.inMillis * 24)
    public static readonly Weeks = new TimeUnit(TimeUnit.Days.inMillis * 7)

    private constructor(public readonly inMillis: number) {}
}

export class TTL {
    private constructor(private readonly amount: number, private readonly unit: TimeUnit) {}

    toString(): string {
        const millis = this.amount * this.unit.inMillis
        return `$util.time.nowEpochMilliSeconds() + ${millis}`
    }

    public static seconds(amount: number): TTL {
        return new TTL(amount, TimeUnit.Seconds)
    }

    public static minutes(amount: number): TTL {
        return new TTL(amount, TimeUnit.Minutes)
    }

    public static hours(amount: number): TTL {
        return new TTL(amount, TimeUnit.Hours)
    }

    public static days(amount: number): TTL {
        return new TTL(amount, TimeUnit.Days)
    }
    public static weeks(amount: number): TTL {
        return new TTL(amount, TimeUnit.Weeks)
    }
}
