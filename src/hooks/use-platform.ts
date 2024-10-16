import { useEffect, useState } from 'react'

export function usePlatform() {
  const [platform, setPlatform] = useState<string | null>(null)

  useEffect(() => {
    const userAgent = navigator.userAgent
    if (userAgent.indexOf('Mac') > -1 && navigator.platform !== 'iPhone') {
      setPlatform('mac')
    } else if (userAgent.indexOf('Win') > -1 || userAgent.indexOf('Linux') > -1) {
      setPlatform('windows')
    } else {
      setPlatform('other')
    }
  }, [])

  return platform || 'other'
}
