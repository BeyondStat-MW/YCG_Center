const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

const keyFilename = path.join(__dirname, 'src/lib/keys/yoon-key.json');

async function checkLatest() {
    console.log("--- Checking Latest Data Date ---");
    const bigquery = new BigQuery({
        projectId: 'ycgcenter',
        keyFilename
    });

    const query = `
    SELECT 
        MAX(recordedDateUtc) as max_recorded,
        MAX(analysedDateUtc) as max_analysed,
        MAX(modifiedDateUtc) as max_modified,
        COUNT(*) as total_rows
    FROM \`ycgcenter.YCGCenter_db.forcedecks\`
  `;

    const [rows] = await bigquery.query(query);
    console.log("Max Dates Found:", rows[0]);

    // Also check top 5 recent rows
    const recentQuery = `
    SELECT recordedDateUtc, testType, profileId
    FROM \`ycgcenter.YCGCenter_db.forcedecks\`
    ORDER BY recordedDateUtc DESC
    LIMIT 5
  `;
    const [recent] = await bigquery.query(recentQuery);
    console.log("\nTop 5 Recent Rows:");
    console.table(recent);
}

checkLatest();
