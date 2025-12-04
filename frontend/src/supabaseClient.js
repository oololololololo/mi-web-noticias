import { createClient } from '@supabase/supabase-js'

// ⚠️ REEMPLAZA ESTOS VALORES CON LOS DE TU PROYECTO EN SUPABASE
// Los encuentras en: Settings (engranaje) -> API
const supabaseUrl = 'https://efrlmhitlzqyvbzlmhuy.supabase.co'
const supabaseAnonKey = 'sb_publishable_SABVvIqjwAqIZg-3tMoQ7w_WyMSK0VQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)