import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

const KEYS_DIR = path.join(process.cwd(), 'src/lib/keys');

export function getYonginClient() {
    return new BigQuery({
        projectId: 'yonginfc',
        keyFilename: path.join(KEYS_DIR, 'yongin-key.json'),
    });
}

export function getYoonClient() {
    return new BigQuery({
        projectId: 'ycgcenter',
        keyFilename: path.join(KEYS_DIR, 'yoon-key.json'),
    });
}

// Reuseable helper for execution
export async function runQuery(client: BigQuery, query: string) {
    try {
        const [rows] = await client.query({ query });
        return rows;
    } catch (error) {
        console.error("BigQuery Error:", error);
        return [];
    }
}
