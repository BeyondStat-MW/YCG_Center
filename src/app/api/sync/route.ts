
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export async function POST(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const company = searchParams.get('company') || 'VALD';

        if (company === 'Keiser' || company === 'Hawkin') {
            return NextResponse.json({
                success: false,
                error: `${company} sync is not yet implemented.`
            });
        }

        if (company !== 'VALD') {
            return NextResponse.json({
                success: false,
                error: `Unknown company: ${company}`
            }, { status: 400 });
        }

        // Run the fast sync script for VALD
        const scriptPath = '/Users/minwooseo/.gemini/antigravity/scratch/beyondstat_dashboard/sync_fast_refresh.py';
        const { stdout, stderr } = await execPromise(`python3 ${scriptPath}`);

        console.log('Sync Output:', stdout);
        if (stderr) console.error('Sync Error:', stderr);

        return NextResponse.json({
            success: true,
            message: 'Synchronization completed.',
            output: stdout
        });
    } catch (e: any) {
        return NextResponse.json({
            success: false,
            error: e.message
        }, { status: 500 });
    }
}
