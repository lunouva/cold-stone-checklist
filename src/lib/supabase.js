import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const configuredSiteUrl = import.meta.env.VITE_SITE_URL

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env')
}

function trimTrailingSlash(url) {
  return url.replace(/\/+$/, '')
}

export function getAuthRedirectUrl(path = '/') {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const browserOrigin = typeof window !== 'undefined' ? window.location.origin : ''
  const origin = browserOrigin || configuredSiteUrl || ''

  if (!origin) return normalizedPath
  return `${trimTrailingSlash(origin)}${normalizedPath}`
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    detectSessionInUrl: true,
    persistSession: true
  }
})
