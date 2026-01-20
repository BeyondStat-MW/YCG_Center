import { getYoonClient, runQuery } from "../db";

const DATASET = 'YCGCenter_db';

export async function getYoonKPIs() {
    console.log("Fetching Yoon KPIs...");
    const client = getYoonClient();
    const projectId = await client.getProjectId();
    console.log(`Using Project: ${projectId}, Dataset: ${DATASET}`);

    // Total Tests
    const q_tests = `SELECT count(*) as cnt FROM \`${projectId}.${DATASET}.forcedecks\``;

    // Active Rehab (Cleaned Logic)
    // Count distinct profiles active in last 30 days
    // Using modifiedDateUtc as recordedDateUtc might be missing or different
    const q_active = `
        SELECT count(DISTINCT profileId) as cnt 
        FROM \`${projectId}.${DATASET}.forcedecks\` 
        WHERE modifiedDateUtc >= CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY) AS STRING)
    `;

    const [testsRows] = await runQuery(client, q_tests);
    const [activeRows] = await runQuery(client, q_active);

    console.log("KPI Rows:", { tests: testsRows, active: activeRows });

    // This month
    const q_month = `
        SELECT count(*) as cnt 
        FROM \`${projectId}.${DATASET}.forcedecks\`
        WHERE modifiedDateUtc LIKE '${new Date().toISOString().slice(0, 7)}%'
    `;
    const [monthRows] = await runQuery(client, q_month);

    return {
        total_tests: testsRows?.cnt || 0,
        active_rehab: activeRows?.cnt || 0,
        registered: 128, // Placeholder
        month_tests: monthRows?.cnt || 0
    };
}

export async function getYoonProtocolBreakdown() {
    const client = getYoonClient();
    const projectId = await client.getProjectId();

    const query = `
        SELECT testType as name, count(*) as total
        FROM \`${projectId}.${DATASET}.forcedecks\`
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 5
    `;
    return runQuery(client, query);
}

export async function getYoonActivityTrend() {
    const client = getYoonClient();
    const projectId = await client.getProjectId();

    // Monthly Trend
    const query = `
        SELECT 
            SUBSTR(modifiedDateUtc, 1, 7) as month,
            count(*) as total
        FROM \`${projectId}.${DATASET}.forcedecks\`
        GROUP BY 1
        ORDER BY 1 ASC
        LIMIT 6
    `;

    const rows = await runQuery(client, query);
    return rows.map((r: any) => ({
        name: r.month,
        total: r.total
    }));
}

export async function getYoonRecentTests() {
    console.log("Fetching Yoon Recent Tests (Limit 500)...");
    const client = getYoonClient();
    const projectId = await client.getProjectId();

    // Use modifiedDateUtc
    const query = `
        SELECT 
            t.modifiedDateUtc as date,
            t.testType,
            p.givenName,
            p.familyName,
            t.CMJ_Height,
            t.SJ_Height
        FROM \`${projectId}.${DATASET}.forcedecks\` t
        LEFT JOIN \`${projectId}.${DATASET}.profiles\` p ON t.profileId = p.profileId
        ORDER BY t.modifiedDateUtc DESC
        LIMIT 500
    `;

    try {
        const rows = await runQuery(client, query);
        console.log(`Fetched ${rows.length} recent records.`);
        if (rows.length > 0) console.log("Sample Row:", rows[0]);

        return rows.map((row: any) => ({
            Date: row.date ? new Date(row.date).toLocaleDateString() : '-',
            Player: `${row.familyName || ''}${row.givenName || ''}`,
            Test: row.testType,
            CMJ: row.CMJ_Height ? parseFloat(row.CMJ_Height.toFixed(1)) : '-',
            SJ: row.SJ_Height ? parseFloat(row.SJ_Height.toFixed(1)) : '-'
        }));
    } catch (e) {
        console.error("Error fetching recent tests:", e);
        return [];
    }
}

export async function getYoonPlayers() {
    const client = getYoonClient();
    const projectId = await client.getProjectId();

    // Fetch from profiles
    const query = `
        SELECT DISTINCT givenName, familyName 
        FROM \`${projectId}.${DATASET}.profiles\`
        WHERE givenName IS NOT NULL
        ORDER BY familyName, givenName
    `;

    try {
        const rows = await runQuery(client, query);
        return rows.map((r: any) => ({
            name: `${r.familyName || ''}${r.givenName || ''}`.trim(),
            id: `${r.familyName || ''}${r.givenName || ''}`.trim()
        }));
    } catch (e) {
        console.error("Error fetching players:", e);
        return [];
    }
}

export async function getYoonPlayerHistory(playerName: string) {
    const client = getYoonClient();
    const projectId = await client.getProjectId();

    const dateFilter = `modifiedDateUtc >= CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH) AS STRING)`;
    const dateFilterSS = `testDateUtc >= CAST(DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH) AS STRING)`;

    // 1. ForceDecks (Jumps)
    const q_jumps = `
        SELECT 
            t.modifiedDateUtc as date,
            t.testType,
            t.CMJ_Height,
            t.SJ_Height,
            t.RSI_Modified_m_s
        FROM \`${projectId}.${DATASET}.forcedecks\` t
        LEFT JOIN \`${projectId}.${DATASET}.profiles\` p ON t.profileId = p.profileId
        WHERE CONCAT(IFNULL(p.familyName,''), IFNULL(p.givenName,'')) = '${playerName}'
        AND ${dateFilter}
        ORDER BY date ASC
    `;

    // 2. NordBord (Strength)
    const q_nord = `
        SELECT 
            t.modifiedDateUtc as date,
            t.Max_Force_Both_Legs_N,
            t.Max_Force_Left_N,
            t.Max_Force_Right_N
        FROM \`${projectId}.${DATASET}.nordbord\` t
        LEFT JOIN \`${projectId}.${DATASET}.profiles\` p ON t.profileId = p.profileId
        WHERE CONCAT(IFNULL(p.familyName,''), IFNULL(p.givenName,'')) = '${playerName}'
        AND ${dateFilter}
        ORDER BY date ASC
    `;

    // 3. SmartSpeed (Sprint) use testDateUtc based on sync config
    const q_speed = `
        SELECT 
            t.testDateUtc as date,
            t.testType,
            t.Split_1_Time,
            t.Split_2_Time,
            t.Total_Time
        FROM \`${projectId}.${DATASET}.smartspeed\` t
        LEFT JOIN \`${projectId}.${DATASET}.profiles\` p ON t.profileId = p.profileId
        WHERE CONCAT(IFNULL(p.familyName,''), IFNULL(p.givenName,'')) = '${playerName}'
        AND ${dateFilterSS}
        ORDER BY date ASC
    `;

    const [jumps, strength, speed] = await Promise.all([
        runQuery(client, q_jumps),
        runQuery(client, q_nord).catch(() => []),
        runQuery(client, q_speed).catch(() => [])
    ]);

    return { jumps, strength, speed };
}
