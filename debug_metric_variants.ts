
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function analyzeMetrics() {
    console.log("Fetching ForceDecks measurements...");

    // Fetch a batch of ForceDecks measurements
    const { data: measurements, error } = await supabaseAdmin
        .from('measurements')
        .select('metrics, test_type')
        .eq('test_type', 'ForceDecks') // Old test_type was used for device
        .limit(100);

    if (error) {
        console.error("Error fetching:", error);
        return;
    }

    console.log(`Analyzing ${measurements.length} records...`);

    const keyCounts: Record<string, number> = {};
    const keySamples: Record<string, any[]> = {};
    const flightTimeVariants: Set<string> = new Set();

    measurements.forEach(m => {
        const metrics = m.metrics;
        // Check for testTypeName to confirm CMJ if possible, but let's look at all ForceDecks first
        const testType = metrics.testType || metrics.testTypeName;

        // Flatten keys
        Object.keys(metrics).forEach(key => {
            keyCounts[key] = (keyCounts[key] || 0) + 1;

            if (key.toLowerCase().includes('flight') && key.toLowerCase().includes('time')) {
                flightTimeVariants.add(key);
                if (!keySamples[key]) keySamples[key] = [];
                if (keySamples[key].length < 3) keySamples[key].push(metrics[key]);
            }
        });
    });

    console.log("\n--- Flight Time Variants Found ---");
    Array.from(flightTimeVariants).sort().forEach(key => {
        console.log(`Key: "${key}" | Count: ${keyCounts[key]} | Samples: ${JSON.stringify(keySamples[key])}`);
    });

    // Check if multiple variants appear in the SAME record
    console.log("\n--- Checking co-occurrence ---");
    let coOccurrenceCount = 0;
    measurements.forEach(m => {
        const metrics = m.metrics;
        const variantsInThisRecord = Object.keys(metrics).filter(k => flightTimeVariants.has(k));
        if (variantsInThisRecord.length > 1) {
            coOccurrenceCount++;
            // console.log("Found multiple in one record:", variantsInThisRecord);
        }
    });
    console.log(`Records with multiple Flight Time variants: ${coOccurrenceCount}`);

}

analyzeMetrics();
