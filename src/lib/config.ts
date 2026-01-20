import { supabase } from './supabase'

export interface TeamConfig {
    id: string
    name: string
    slug: string
    logo_url?: string
    theme_config?: {
        primary_color?: string
        secondary_color?: string
        accent_color?: string
        text_color?: string
        portal_title?: string
    }
    api_config?: any
    is_active?: boolean
}

// Fallback static configuration (mirrors config_manager.py)
const STATIC_TEAMS: Record<string, Partial<TeamConfig>> = {
    yoon: {
        name: "Yoon Chung-gu Performance Center",
        slug: "yoon",
        theme_config: {
            primary_color: "#1C1C1E",
            accent_color: "#0A84FF",
            portal_title: "Yoon Center Performance Ops"
        }
    },
    yongin: {
        name: "Yongin FC",
        slug: "yongin",
        theme_config: {
            primary_color: "#0047BB",
            accent_color: "#FFD700",
            portal_title: "Yongin FC Dashboard"
        }
    },
    kleague: {
        name: "K-League Youth",
        slug: "kleague",
        theme_config: {
            primary_color: "#1B263B",
            accent_color: "#415A77",
            portal_title: "K-League Platform"
        }
    }
}

export async function getTeamConfig(teamSlug: string): Promise<TeamConfig | null> {
    // 1. Try DB Lookup
    try {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('slug', teamSlug)
            .single()

        if (data && !error) {
            return data as TeamConfig
        }
    } catch (e) {
        console.error(`Failed to fetch team config for ${teamSlug} from DB:`, e)
    }

    // 2. Fallback to Static Config
    const staticConfig = STATIC_TEAMS[teamSlug]
    if (staticConfig) {
        return {
            id: teamSlug === 'yoon' ? '37b06214-a6b5-4814-aee5-d3c42a2347cd' : teamSlug, // Map to known IDs if possible
            name: staticConfig.name!,
            slug: teamSlug,
            ...staticConfig
        } as TeamConfig
    }

    return null
}

export async function getAllTeams(): Promise<TeamConfig[]> {
    // 1. Try DB Fetch
    try {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .order('name')

        if (data && data.length > 0 && !error) {
            return data as TeamConfig[]
        }
    } catch (e) {
        console.error("Failed to fetch all teams from DB:", e)
    }

    // 2. Fallback to Static Config
    return Object.entries(STATIC_TEAMS).map(([slug, config]) => ({
        id: slug === 'yoon' ? '37b06214-a6b5-4814-aee5-d3c42a2347cd' : slug,
        name: config.name || slug,
        slug: slug,
        ...config
    })) as TeamConfig[]
}
