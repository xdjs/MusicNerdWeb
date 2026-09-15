// Re-export everything from the modularised implementation located in ./ (current directory)
export * from "./artistQueries";
export * from "./getLeaderboard";
export * from "./getLeaderboardInRange";
export * from "./getUgcStats";
export * from "./getUgcStatsInRange";
export * from "./leaderboardTypes";
export * from "./userQueries";
export * from "./discord";
export * from "./externalApiQueries";
export * from "./artistBioQuery";


const {youtube_api_key} = process.env;

export type YTStats = {
    id: string;
    title: string;
    subCount: number;
    viewCount: number;
    videoCount: number;
    description: string;

};

 






