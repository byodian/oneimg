export interface AdvertisingConfig {
  cmpSrc: string | null;
  adClient: string | null;
  adSlot: string | null;
}

// Server-only environment access. No account values are logged or stored in content.
export function advertisingConfig(): AdvertisingConfig {
  let cmpSrc: string | null = null
  if (process.env.ONEIMG_CMP_ENABLED === '1' && process.env.ONEIMG_CMP_INDEPENDENT_VERIFIED === '1') {
    try {
      const url = new URL(process.env.ONEIMG_GOOGLE_CMP_SRC ?? '')
      if (url.origin === 'https://fundingchoicesmessages.google.com' && /^\/i\/(?:ca-)?pub-\d{16}$/.test(url.pathname) && !url.username && !url.password && !url.hash) {
        cmpSrc = url.href
      }
    } catch { /* Missing or invalid official tag leaves advertising disabled. */ }
  }
  const client = process.env.ONEIMG_ADS_CLIENT ?? ''
  const slot = process.env.ONEIMG_ADS_SLOT ?? ''
  const enabled = process.env.ONEIMG_ADS_ENABLED === '1' && cmpSrc !== null && /^ca-pub-\d{16}$/.test(client) && /^\d{10}$/.test(slot)
  return { cmpSrc, adClient: enabled ? client : null, adSlot: enabled ? slot : null }
}
