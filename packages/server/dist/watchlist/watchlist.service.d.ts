export declare function getUserWatchlists(userId: string): Promise<({
    items: {
        symbol: string;
        id: string;
        addedAt: Date;
        watchlistId: string;
    }[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    userId: string;
})[]>;
export declare function createWatchlist(userId: string, name: string): Promise<{
    items: {
        symbol: string;
        id: string;
        addedAt: Date;
        watchlistId: string;
    }[];
} & {
    id: string;
    createdAt: Date;
    name: string;
    userId: string;
}>;
export declare function addWatchlistItem(userId: string, watchlistId: string, symbol: string): Promise<{
    symbol: string;
    id: string;
    addedAt: Date;
    watchlistId: string;
}>;
export declare function removeWatchlistItem(userId: string, watchlistId: string, symbol: string): Promise<{
    success: boolean;
    message: string;
}>;
export declare function ackWatchlistItem(userId: string, watchlistId: string, symbol: string): Promise<{
    success: boolean;
    symbol: string;
    lastViewedAt: Date;
    lastViewedPrice: number;
}>;
export declare function getWatchlistSummary(userId: string, watchlistId: string, sensitivity?: string): Promise<{
    watchlist: {
        id: string;
        userId: string;
        name: string;
        createdAt: string;
        items: {
            id: string;
            watchlistId: string;
            symbol: string;
            addedAt: string;
        }[];
    };
    digest: {
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
    }[];
    globalSummary: string | null;
}>;
