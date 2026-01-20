
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

async function verifySchema() {
    console.log("Verifying Database Schema Upgrade...");

    // 1. Check for new columns via a dummy insert/select
    // We can't easily query information_schema via supabase-js without an RPC, 
    // but we can try to select the new columns.

    const { data: selectData, error: selectError } = await supabaseAdmin
        .from('metric_configs')
        .select('device, test_category, test_position')
        .limit(1);

    if (selectError) {
        console.error("❌ Schema Verification Failed: Could not select new columns.", selectError.message);
        return;
    }
    console.log("✅ Columns 'device', 'test_category', 'test_position' detected.");

    // 2. Test Hierarchical Constraint & Constraint Drop
    // Try to insert two records with SAME metric_key but DIFFERENT category.
    // This should FAIL if the old constraint exists, but SUCCEED if the new schema is correct.

    const testKey = `VERIFY_SCHEMA_${Date.now()}`;
    const record1 = {
        device: 'VerifyDevice',
        test_category: 'CategoryA',
        test_position: 'PosA',
        metric_key: testKey,
        display_name: 'Verify A',
        visible: true,
        test_type: 'VerifyDevice' // Legacy column
    };

    const record2 = {
        device: 'VerifyDevice',
        test_category: 'CategoryB',   // DIFFERENT category
        test_position: 'PosA',
        metric_key: testKey,          // SAME key
        display_name: 'Verify B',
        visible: true,
        test_type: 'VerifyDevice'
    };

    console.log(`Attempting to insert two records with same key '${testKey}' in different categories...`);

    // Insert Record 1
    const { error: ins1 } = await supabaseAdmin.from('metric_configs').insert(record1);
    if (ins1) {
        console.error("❌ Insert Record 1 Failed:", ins1.message);
        return;
    }

    // Insert Record 2 (Should succeed now!)
    const { error: ins2 } = await supabaseAdmin.from('metric_configs').insert(record2);

    if (ins2) {
        console.error("❌ Insert Record 2 Failed:", ins2.message);
        if (ins2.message.includes('metric_configs_unique')) {
            console.error("   CRITICAL: The OLD unique constraint still exists. Please run the SQL script again.");
        }
    } else {
        console.log("✅ Insert Record 2 Succeeded! The legacy unique constraint is gone.");
    }

    // Cleanup
    await supabaseAdmin.from('metric_configs').delete().eq('metric_key', testKey);
    console.log("Cleanup done.");

    if (!ins2) {
        console.log("\n🎉 ALL CHECKS PASSED. The database is ready for Hierarchical Settings.");
    }
}

verifySchema();
