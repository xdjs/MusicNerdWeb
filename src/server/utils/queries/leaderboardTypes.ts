export type LeaderboardEntry = {
    userId: string;
    wallet: string | null;
    username: string | null;
    email: string | null;
    artistsCount: number;
    ugcCount: number;
    isHidden: boolean;
};
