import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Types for database tables
export interface Plane {
  id: string
  user_id: string
  tail_number: string
  model: string | null
  manufacturer: string | null
  created_at: string
  updated_at: string
}

export interface Device {
  device_uuid: string
  user_id: string | null
  plane_id: string | null
  name: string | null
  created_at: string
  updated_at: string
  last_seen: string | null
  plane?: Plane
}

export interface Session {
  id: string
  device_uuid: string
  session_start: string
  run_seconds: number
  last_update: string | null
  status: 'open' | 'closed'
  msg_id: string
  created_at: string
  updated_at: string
}

// Extended types with joins
export interface DeviceWithPlane extends Device {
  plane: Plane | null
}

export interface SessionWithDevice extends Session {
  device: DeviceWithPlane | null
}

