'use client'

import { useEffect, useSyncExternalStore } from 'react'

interface TcData {
  gdprApplies?: boolean;
  cmpStatus?: string;
  eventStatus?: string;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}
interface GppData {
  cmpStatus?: string;
  signalStatus?: string;
  applicableSections?: number[];
  supportedAPIs?: string[];
  parsedSections?: Record<string, Record<string, unknown>[]>;
}
interface GoogleFc {
  callbackQueue: { push: (callback: Record<string, () => void>) => unknown };
  showRevocationMessage?: () => void;
  getGoogleConsentModeValues?: () => { adStoragePurposeConsentStatus?: number; adUserDataPurposeConsentStatus?: number; adPersonalizationPurposeConsentStatus?: number };
  usstatesoptout?: { getInitialUsStatesOptOutStatus?: () => number };
}
declare global {
  interface Window {
    googlefc?: GoogleFc;
    __tcfapi?: (command: string, version: number, callback: (data: TcData | undefined, success: boolean) => void) => void;
    __gpp?: (command: string, callback: (data: GppData | { pingData?: GppData } | undefined, success: boolean) => void) => void;
    adsbygoogle?: { push: (value: Record<string, never>) => unknown };
  }
}

type PrivacyState = { status: 'idle' | 'loading' | 'pending' | 'ready' | 'unavailable'; allowed: boolean; euApplies: boolean | null }
const initial: PrivacyState = { status: 'idle', allowed: false, euApplies: null }
let state = initial
const subscribers = new Set<() => void>()
let started = false
let apiReady = false
let modeReady = false
let tcfReady = false
let usReady = false
let tcfAllowed = false
let usAllowed = false
let modeAllowed = false
let timeout: ReturnType<typeof setTimeout> | undefined

function publish(next: PrivacyState) {
  // Removing a script element cannot revoke already executing advertising code.
  if (state.allowed && !next.allowed && document.getElementById('oneimg-ad-script')) {
    window.location.reload()
    return
  }
  state = next
  subscribers.forEach(notify => notify())
}

function update() {
  const ready = modeReady && tcfReady && usReady
  if (ready) {
    clearTimeout(timeout)
  }
  publish({ ...state, status: ready ? 'ready' : state.status === 'unavailable' ? 'unavailable' : apiReady ? 'pending' : 'loading', allowed: ready && tcfAllowed && modeAllowed && usAllowed })
}

function readMode() {
  const mode = window.googlefc?.getGoogleConsentModeValues?.()
  modeReady = !!mode && [mode.adStoragePurposeConsentStatus, mode.adUserDataPurposeConsentStatus, mode.adPersonalizationPurposeConsentStatus].every(value => value !== undefined && value >= 1 && value <= 4)
  // Unknown, denied and unconfigured purposes never authorize this site's slot.
  modeAllowed = !!mode && [mode.adStoragePurposeConsentStatus, mode.adUserDataPurposeConsentStatus, mode.adPersonalizationPurposeConsentStatus].every(value => value === 1 || value === 3)
  update()
}

function readGpp(data: GppData | undefined, success: boolean) {
  usReady = success && data?.cmpStatus === 'loaded' && data.signalStatus === 'ready'
  usAllowed = false
  if (usReady && data?.applicableSections?.length) {
    usAllowed = data.applicableSections.every((id) => {
      if (id === -1) {
        return true
      }
      const prefix = data.supportedAPIs?.find(api => api.startsWith(`${id}:`))?.split(':')[1]
      const segments = prefix?.startsWith('us') ? data.parsedSections?.[prefix] : undefined
      if (!segments?.length) {
        return false
      }
      let hasOptOut = false
      const permitted = segments.every(segment => Object.entries(segment).every(([key, value]) => {
        if (key === 'Gpc') {
          return value === false
        }
        if (key.endsWith('OptOut')) {
          hasOptOut = true
          return value === 0 || value === 2
        }
        return true
      }))
      return hasOptOut && permitted
    })
  }
  update()
}

export function startGooglePrivacy(src: string) {
  if (started) {
    return
  }
  started = true
  publish({ ...initial, status: 'loading' })
  const unavailable = () => {
    clearTimeout(timeout); publish({ ...state, status: 'unavailable', allowed: false })
  }
  timeout = setTimeout(unavailable, 15000)
  const fc: GoogleFc = window.googlefc ?? { callbackQueue: new Array<Record<string, () => void>>() }
  window.googlefc = fc
  fc.callbackQueue.push({
    CONSENT_API_READY: () => {
      apiReady = true
      clearTimeout(timeout)
      if (!window.__tcfapi) {
        unavailable(); return
      }
      window.__tcfapi('addEventListener', 2, (data, success) => {
        if (!success || !data || data.cmpStatus === 'error') {
          tcfReady = false
          tcfAllowed = false
          unavailable()
          return
        }
        const settled = data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete'
        // Opening Google's revocation UI emits an unsettled cmpuishown event.
        // Keep the previous settled choice until the visitor submits a new one.
        if (state.allowed && data.gdprApplies === true && !settled) {
          return
        }
        tcfReady = data.cmpStatus === 'loaded' && typeof data.gdprApplies === 'boolean' && (data.gdprApplies === false || settled)
        tcfAllowed = tcfReady && (data.gdprApplies === false || (settled && data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true))
        state = { ...state, euApplies: typeof data.gdprApplies === 'boolean' ? data.gdprApplies : null }
        readMode()
      })
      if (window.__gpp) {
        window.__gpp('addEventListener', (event, success) => {
          if (!success || !event) {
            usReady = false; usAllowed = false; unavailable(); return
          }
          if ('pingData' in event && event.pingData) {
            readGpp(event.pingData, true)
          } else {
            window.__gpp?.('ping', (data, ok) => readGpp(data as GppData, ok))
          }
        })
      }
    },
  })
  fc.callbackQueue.push({ CONSENT_MODE_DATA_READY: readMode })
  fc.callbackQueue.push({
    INITIAL_US_STATES_OPT_OUT_DATA_READY: () => {
      if (window.__gpp) {
        window.__gpp('ping', (data, success) => readGpp(data as GppData, success))
      } else {
      // A known DOES_NOT_APPLY is the only safe result without a live GPP API.
        usReady = window.googlefc?.usstatesoptout?.getInitialUsStatesOptOutStatus?.() === 1
        usAllowed = usReady
        update()
      }
    },
  })
  const script = document.createElement('script')
  script.id = 'oneimg-google-cmp'
  script.async = true
  script.src = src
  script.onerror = unavailable
  document.head.appendChild(script)
}

export function reopenGooglePrivacy(): boolean {
  if ((state.status !== 'ready' && state.status !== 'pending') || state.euApplies !== true || !window.googlefc?.showRevocationMessage) {
    return false
  }
  window.googlefc.callbackQueue.push({ CONSENT_API_READY: () => window.googlefc?.showRevocationMessage?.() })
  return true
}

export function useGooglePrivacy(src: string | null, autoStart: boolean) {
  const value = useSyncExternalStore((callback) => {
    subscribers.add(callback); return () => {
      subscribers.delete(callback)
    }
  }, () => state, () => initial)
  useEffect(() => {
    if (autoStart && src) {
      startGooglePrivacy(src)
    }
  }, [src, autoStart])
  return value
}
