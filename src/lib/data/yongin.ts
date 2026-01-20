import { getYonginClient, runQuery } from "../db";

export async function getYonginTeamStats() {
    const client = getYonginClient();

    // Basic KPI Query: Average CMJ and Squat Jump from recent tests
    // Note: Using a limit to avoid fetching everything. 
    // In real app, we might want last month's average.
    const query = `
    SELECT 
      AVG(SAFE_CAST(CMJ_Height AS FLOAT64)) as avg_cmj,
      AVG(SAFE_CAST(SquatJ_Height AS FLOAT64)) as avg_squat,
      AVG(SAFE_CAST(Hamstring_Ecc_R AS FLOAT64)) as avg_hamstring,
      COUNT(DISTINCT Name) as total_players
    FROM \`yonginfc.vald_data.vald_all_data\`
    WHERE Date >= DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY)
  `;

    const rows = await runQuery(client, query);
    if (rows && rows.length > 0) {
        return rows[0];
    }
    return { avg_cmj: 0, avg_squat: 0, avg_hamstring: 0, total_players: 0 };
}

export async function getYonginPowerTrend() {
    const client = getYonginClient();
    // Monthly Trend
    const query = `
        SELECT 
            FORMAT_DATE('%Y-%m', PARSE_DATE('%Y-%m-%d', Date)) as month,
            AVG(SAFE_CAST(CMJ_Height AS FLOAT64)) as cmj,
            AVG(SAFE_CAST(SquatJ_Height AS FLOAT64)) as squat
        FROM \`yonginfc.vald_data.vald_all_data\`
        WHERE Date IS NOT NULL
        GROUP BY month
        ORDER BY month ASC
        LIMIT 6
    `;
    const rows = await runQuery(client, query);
    return rows.map((row: any) => ({
        date: row.month,
        cmj: row.cmj ? parseFloat(row.cmj.toFixed(1)) : 0,
        squat: row.squat ? parseFloat(row.squat.toFixed(1)) : 0
    }));
}

export async function getYonginRecentTests() {
    const client = getYonginClient();
    const query = `
        SELECT 
            Date,
            Name,
            CMJ_Height,
            SquatJ_Height,
            Hamstring_Ecc_R,
            Hamstring_Ecc_L
        FROM \`yonginfc.vald_data.vald_all_data\`
        WHERE Date IS NOT NULL
        ORDER BY Date DESC
        LIMIT 500
    `;
    const rows = await runQuery(client, query);
    // Simple formatting
    return rows.map((row: any) => ({
        Date: row.Date ? row.Date.value : 'N/A',
        Name: row.Name,
        CMJ: row.CMJ_Height,
        Squat: row.SquatJ_Height,
        Ham_R: row.Hamstring_Ecc_R,
        Ham_L: row.Hamstring_Ecc_L
    }));
}
