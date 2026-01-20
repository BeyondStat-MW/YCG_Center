
import { supabase } from './supabase'

export interface Profile {
    id: string
    team_id?: string
    name: string
    position?: string
    height?: number
    weight?: number
}

export interface Measurement {
    id: number
    player_id: string
    test_type: string
    recorded_at: string
    metrics: any
}

// --- Profiles ---

export async function getProfiles() {
    try {
        const res = await fetch('/api/profiles')
        if (!res.ok) {
            console.error('Failed to fetch profiles:', res.statusText)
            return []
        }
        return await res.json() as Profile[]
    } catch (error) {
        console.error('Error fetching profiles:', error)
        return []
    }
}

export async function createProfile(profile: Partial<Profile>) {
    const { data, error } = await supabase
        .from('profiles')
        .insert([profile])
        .select()

    if (error) throw error
    return data?.[0]
}

// --- Measurements ---

export async function getMeasurements(playerId: string) {
    try {
        const res = await fetch(`/api/measurements?playerId=${playerId}`)
        if (!res.ok) {
            console.error('Failed to fetch measurements:', res.statusText)
            return []
        }
        return await res.json() as Measurement[]
    } catch (error) {
        console.error('Error fetching measurements:', error)
        return []
    }
}

export async function addMeasurement(measurement: Partial<Measurement>) {
    const { data, error } = await supabase
        .from('measurements')
        .insert([measurement])
        .select()

    if (error) throw error
    return data?.[0]
}

// --- Seeding (Dev Only) ---

export async function seedInitialData() {
    // 1. Check if user is logged in
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Must be logged in to seed data")

    // 2. Create a dummy profile
    const { data: profile, error: pError } = await supabase
        .from('profiles')
        .upsert({
            id: user.id, // Link to auth user for simplicity in this demo
            name: 'Son Heung-min',
            position: 'Forward',
            height: 183,
            weight: 77
        })
        .select()
        .single()

    if (pError) console.error("Profile creation error:", pError)

    if (!profile) return

    // 3. Add some dummy measurements
    const sampleData = [
        { type: 'Jump', cmj: 45.2, sj: 42.1, date: '2024-01-01T10:00:00Z' },
        { type: 'Jump', cmj: 46.5, sj: 43.0, date: '2024-01-15T10:00:00Z' },
        { type: 'Jump', cmj: 47.8, sj: 44.2, date: '2024-02-01T10:00:00Z' },
        { type: 'Strength', nordic: 450, date: '2024-01-05T10:00:00Z' },
        { type: 'Strength', nordic: 480, date: '2024-02-05T10:00:00Z' },
    ]

    for (const d of sampleData) {
        await supabase.from('measurements').insert({
            player_id: profile.id,
            test_type: d.type === 'Jump' ? 'CMJ' : 'Nordbord', // Simplified
            recorded_at: d.date,
            metrics: d.type === 'Jump' ? { CMJ_Height: d.cmj, SJ_Height: d.sj } : { Max_Force_Both_Legs_N: d.nordic }
        })
    }

    console.log("Seeding complete!")
}

// --- Overview ---

export async function getCenterOverview() {
    try {
        const res = await fetch('/api/overview', { cache: 'no-store' })
        if (!res.ok) {
            console.error('Failed to fetch overview:', res.statusText)
            return null
        }
        return await res.json()
    } catch (error) {
        console.error('Error fetching overview:', error)
        return null
    }
}
