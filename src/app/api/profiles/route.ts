
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
    // Admin client for full access
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    try {
        let allProfiles: any[] = [];
        let page = 0;
        const pageSize = 1000;

        while (true) {
            const { data, error } = await supabaseAdmin
                .from('profiles')
                .select('*')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (error) throw error;
            if (!data || data.length === 0) break;

            allProfiles = allProfiles.concat(data);
            if (data.length < pageSize) break;
            page++;
        }

        // Return sorted
        allProfiles.sort((a, b) => a.name.localeCompare(b.name));

        return NextResponse.json({ profiles: allProfiles });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
