
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function dumpMetrics() {
    console.log('Sampling test metrics...')

    const testTypes = ['CMJ', 'NordBord', 'ForceFrame', 'SmartSpeed', 'Dynamo']

    for (const type of testTypes) {
        console.log(`\n--- Test Type: ${type} ---`)
        const { data, error } = await supabase
            .from('measurements')
            .select('metrics')
            .eq('test_type', type)
            .limit(1)

        if (error) {
            console.error(`Error fetching ${type}:`, error.message)
        } else if (data && data.length > 0) {
            console.log('Sample metrics:', JSON.stringify(data[0].metrics, null, 2))
        } else {
            console.log('No data found for this test type.')
        }
    }
}

dumpMetrics()
