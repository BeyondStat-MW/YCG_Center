import { BigQuery } from '@google-cloud/bigquery';
import path from 'path';

export function getYonginClient() {
    // Vercel Production
    if (process.env.GOOGLE_CREDENTIALS_YONGIN) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_YONGIN);
            return new BigQuery({
                projectId: 'yonginfc',
                credentials,
            });
        } catch (e) {
            console.error("Failed to parse GOOGLE_CREDENTIALS_YONGIN", e);
        }
    }

    // Local Fallback (if key exists)
    return new BigQuery({
        projectId: 'yonginfc',
        keyFilename: path.join(process.cwd(), 'src/lib/keys/yongin-key.json'),
    });
}

export function getYoonClient() {
    // Vercel Production
    if (process.env.GOOGLE_CREDENTIALS_YOON) {
        try {
            const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_YOON);
            return new BigQuery({
                projectId: 'ycgcenter',
                credentials,
            });
        } catch (e) {
            console.error("Failed to parse GOOGLE_CREDENTIALS_YOON", e);
        }
    }

    // Local Fallback
    return new BigQuery({
        projectId: 'ycgcenter',
        keyFilename: path.join(process.cwd(), 'src/lib/keys/yoon-key.json'),
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
