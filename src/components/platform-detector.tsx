'use client'

import { useEffect } from 'react'

export default function PlatformDetector() {
  useEffect(() => {
    const platform = detectPlatform()
    document.documentElement.setAttribute('data-platform', platform)
  }, [])

  return null
}

function detectPlatform() {
  const userAgent = window.navigator.userAgent
  const platform = window.navigator.platform
  const macosPlatforms = ['Macintosh', 'MacIntel', 'MacPPC', 'Mac68K']
  const windowsPlatforms = ['Win32', 'Win64', 'Windows', 'WinCE']
  const iosPlatforms = ['iPhone', 'iPad', 'iPod']

  if (macosPlatforms.indexOf(platform) !== -1) {
    return 'mac'
  } else if (iosPlatforms.indexOf(platform) !== -1) {
    return 'ios'
  } else if (windowsPlatforms.indexOf(platform) !== -1) {
    return 'windows'
  } else if (/Android/.test(userAgent)) {
    return 'android'
  } else if (/Linux/.test(platform)) {
    return 'linux'
  }

  return 'unknown'
}
