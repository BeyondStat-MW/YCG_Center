export type TeamStats = {
    team_id: string;
    total_players: number;
    total_tests: number;
    last_activity: string;
    avg_cmj_height: number | null;
    avg_nordbord_force: number | null;
};

export type SeasonStats = {
    team_id: string;
    player_id: string;
    season: number;
    test_count: number;
    last_test_date: string;
    season_max_cmj: number | null;
    season_avg_cmj: number | null;
};

export type DailyStats = {
    team_id: string;
    test_date: string;
    device_type: string;
    test_count: number;
    active_players: number;
};
