import { PHASE_DEVELOPMENT_SERVER } from 'next/constants.js'
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'

/**
 * @param {string} phase
 * @returns {Promise<import('next').NextConfig>}
 */
export default async function nextConfig(phase) {
  if (phase === PHASE_DEVELOPMENT_SERVER) {
    await initOpenNextCloudflareForDev()
  }

  return {}
}
