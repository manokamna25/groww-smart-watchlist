export declare function calculateWatchlistDigest(userId: string, symbols: string[]): Promise<{
    symbol: string;
    unseenEventsCount: number;
    events: {
        id: string;
        symbol: string;
        ts: string;
        tier: any;
        score: number;
        narrative: string;
        signals: any;
        createdAt: string;
        acknowledged: boolean;
    }[];
    lastViewedAt: string | undefined;
    lastViewedPrice: number | undefined;
}[]>;
export declare function getEventBreakdown(eventId: string): Promise<{
    id: string;
    symbol: string;
    ts: string;
    tier: string;
    score: number;
    narrative: string;
    signals: import("@prisma/client/runtime/library").JsonValue;
    latestPrice: number | null;
    createdAt: string;
}>;
export declare function acknowledgeEvent(userId: string, eventId: string): Promise<{
    success: boolean;
    eventId: string;
    status: string;
    updatedAt: string;
}>;
