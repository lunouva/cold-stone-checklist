function getEnv(name) {
  return globalThis.Netlify?.env?.get?.(name) || process.env[name]
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  })
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const supabaseUrl = getEnv('VITE_SUPABASE_URL')
  const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY')
  const resendApiKey = getEnv('RESEND_API_KEY')
  const fromEmail = getEnv('INVITE_FROM_EMAIL')
  const authHeader = req.headers.get('authorization')

  if (!supabaseUrl || !supabaseAnonKey) return json({ error: 'Supabase env vars are missing.' }, 500)
  if (!authHeader) return json({ error: 'Missing authorization header.' }, 401)

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader
    }
  })

  if (!userResponse.ok) return json({ error: 'Invalid session.' }, 401)

  const payload = await req.json()
  const { email, role, inviteUrl, organizationName, inviterName } = payload

  if (!email || !inviteUrl || !organizationName) {
    return json({ error: 'Missing invite email, URL, or organization name.' }, 400)
  }

  if (!resendApiKey || !fromEmail) {
    return json({ ok: true, skipped: true, reason: 'Email provider is not configured.' })
  }

  const subject = `${inviterName || 'Your manager'} invited you to ${organizationName}`.replace(/[\r\n]/g, ' ')
  const roleLabel = role === 'manager' ? 'manager' : 'team member'
  const safeOrganizationName = escapeHtml(organizationName)
  const safeInviterName = escapeHtml(inviterName || 'Your manager')
  const safeInviteUrl = escapeHtml(inviteUrl)

  const emailResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromEmail,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f2937;">
          <h1 style="font-size: 20px;">Join ${safeOrganizationName}</h1>
          <p>${safeInviterName} invited you as a ${roleLabel} in Operations Checklist.</p>
          <p><a href="${safeInviteUrl}" style="display: inline-block; background: #7B2D26; color: white; padding: 12px 18px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accept invite</a></p>
          <p style="font-size: 12px; color: #6b7280;">If the button does not work, paste this link into your browser: ${safeInviteUrl}</p>
        </div>
      `
    })
  })

  if (!emailResponse.ok) {
    const detail = await emailResponse.text()
    return json({ error: detail || 'Email provider rejected the invite.' }, 502)
  }

  return json({ ok: true })
}

export const config = {
  path: '/api/send-invite',
  method: ['POST']
}
