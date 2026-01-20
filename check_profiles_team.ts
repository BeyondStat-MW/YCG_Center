
import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function checkProfilesTeamId() {
    try {
        const response = await axios.get(`${supabaseUrl}/rest/v1/profiles?select=team_id`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })
        const teamIds = response.data.map((p: any) => p.team_id)
        const counts = teamIds.reduce((acc: any, id: string) => {
            acc[id] = (acc[id] || 0) + 1
            return acc
        }, {})
        console.log('--- Profile team_id Distribution ---')
        console.log(counts)
    } catch (error: any) {
        console.error('Error fetching profiles:', error.message)
    }
}

checkProfilesTeamId()
