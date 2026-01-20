
import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getTeams() {
    try {
        const response = await axios.get(`${supabaseUrl}/rest/v1/teams`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        console.log('--- Teams Table Data ---')
        console.table(response.data)
    } catch (error: any) {
        console.error('Error fetching teams:', error.message)
    }
}

getTeams()
