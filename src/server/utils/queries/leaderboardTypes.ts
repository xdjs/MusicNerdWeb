export type LeaderboardEntry = {
    userId: string;
    wallet: string;
    username: string | null;
    email: string | null;
    artistsCount: number;
    ugcCount: number;
    isHidden: boolean;
};
