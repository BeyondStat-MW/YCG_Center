
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables manually
const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath))
    for (const k in envConfig) {
        process.env[k] = envConfig[k]
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY! // Use Service Role for Admin writes

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("Missing Supabase URL or Service Role Key.")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateData() {
    console.log("Starting Tenant Data Migration...")

    // 1. Update Existing 'Default Team' to 'Yoon Chung-gu Performance Center'
    const yoonId = '37b06214-a6b5-4814-aee5-d3c42a2347cd';
    console.log(`Updating Default Team (${yoonId}) -> Yoon Center...`);

    const { error: errorUpdate } = await supabase
        .from('teams')
        .update({
            name: "Yoon Chung-gu Performance Center",
            slug: "yoon",
            theme_config: {
                primary_color: "#1C1C1E",
                accent_color: "#0A84FF",
                portal_title: "Yoon Center Performance Ops",
                text_color: "#ffffff"
            },
            api_config: {
                org_id: "yoon_center",
                bq_dataset_id: "yoon_analytics"
            },
            is_active: true
        })
        .eq('id', yoonId);

    if (errorUpdate) {
        console.error("Error updating Yoon Center:", errorUpdate);
    } else {
        console.log("✅ Yoon Center updated successfully.");
    }

    // 2. Upsert Other Teams (Yongin, K-League)
    const newTeams = [
        {
            name: "Yongin FC",
            slug: "yongin",
            theme_config: {
                primary_color: "#0047BB",
                accent_color: "#FFD700",
                portal_title: "Yongin FC Dashboard",
                text_color: "#ffffff"
            },
            api_config: {
                org_id: "yongin_fc",
                bq_dataset_id: "yongin_fc"
            },
            is_active: true
        },
        {
            name: "K-League Youth",
            slug: "kleague",
            theme_config: {
                primary_color: "#1B263B", // Navy
                accent_color: "#415A77", // Silver-Blue
                portal_title: "K-League Platform",
                text_color: "#ffffff"
            },
            api_config: {
                org_id: "kleague",
                bq_dataset_id: "kleague_youth"
            },
            is_active: true
        }
    ];

    for (const team of newTeams) {
        console.log(`Upserting ${team.name}...`);

        // Use upsert on slug to avoid duplicates if re-run
        const { error } = await supabase
            .from('teams')
            .upsert(team, { onConflict: 'slug' });

        if (error) {
            console.error(`Error upserting ${team.name}:`, error);
        } else {
            console.log(`✅ ${team.name} processed successfully.`);
        }
    }

    console.log("Migration Complete.");
}

migrateData();
