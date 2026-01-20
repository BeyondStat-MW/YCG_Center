
import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

async function getOpenApi() {
    try {
        const response = await axios.get(`${supabaseUrl}/rest/v1/`, {
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`
            }
        })

        const definitions = response.data.definitions
        const tables = ['profiles', 'measurements', 'teams', 'mv_team_stats', 'mv_daily_stats']

        tables.forEach(tableName => {
            const table = definitions[tableName]
            if (table) {
                console.log(`\n### Table: ${tableName}`)
                console.log('| Column | Type | Format | Nullable | Description |')
                console.log('| :--- | :--- | :--- | :--- | :--- |')

                const properties = table.properties
                const required = table.required || []

                Object.keys(properties).forEach(colName => {
                    const prop = properties[colName]
                    const isNullable = !required.includes(colName)
                    console.log(`| ${colName} | ${prop.type} | ${prop.format || '-'} | ${isNullable} | ${prop.description || '-'} |`)
                })
            } else {
                console.log(`\n### Table: ${tableName} (Not found in definition)`)
            }
        })
    } catch (error: any) {
        console.error('Error fetching OpenAPI spec:', error.message)
        if (error.response) {
            console.error('Data:', error.response.data)
        }
    }
}

getOpenApi()
