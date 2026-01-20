const { BigQuery } = require('@google-cloud/bigquery');
const path = require('path');

const keyFilename = path.join(__dirname, 'src/lib/keys/yoon-key.json');

async function inspectSchema() {
    console.log("--- Yoon Center Profile Schema ---");
    try {
        const bigquery = new BigQuery({ keyFilename });
        const datasetId = 'YCGCenter_db';
        const tableId = 'profiles';

        console.log(`Getting schema for ${datasetId}.${tableId}...`);
        const [metadata] = await bigquery.dataset(datasetId).table(tableId).getMetadata();

        console.log("COLUMNS FOUND:");
        metadata.schema.fields.forEach(f => {
            console.log(` - ${f.name} (${f.type})`);
        });

    } catch (error) {
        console.error("❌ Schema Inspection Failed:", error.message);
    }
}

inspectSchema();
