/** @type {import('next').NextConfig} */
// added by create cloudflare to enable calling `getCloudflareContext()` in `next dev`
import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare'
const nextConfig = {}

export default nextConfig
initOpenNextCloudflareForDev()
