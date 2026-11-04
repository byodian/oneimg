'use client'

import { useEffect, useRef, useState } from 'react'
import type { AdvertisingConfig } from './advertising-config'
import { reopenGooglePrivacy, startGooglePrivacy, useGooglePrivacy } from './google-cmp'
import styles from './public.module.css'

export function PrivacySettings({ config }: { config: AdvertisingConfig }) {
  const privacy = useGooglePrivacy(config.cmpSrc, false)
  const [hydrated, setHydrated] = useState(false)
  const [requested, setRequested] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => setHydrated(true), [])
  useEffect(() => {
    if (!requested || (privacy.status !== 'ready' && privacy.status !== 'pending')) {
      return
    }
    const opened = reopenGooglePrivacy()
    setRequested(false)
    setMessage(opened ? '已请求打开 Google 隐私选择。请在 Google 消息中完成修改。' : '当前地区没有可重新打开的欧洲法规消息。适用的美国州退出入口由 Google 消息提供；你也可以查看下方的 Google 隐私与广告设置。')
  }, [requested, privacy.status])
  return <section id="choices" className={styles.choices} aria-labelledby="choices-title">
    <h2 id="choices-title">隐私设置</h2>
    <p>通过 Google 的消息查看、修改或撤回适用的隐私选择。拒绝广告不影响阅读和本地创作。</p>
    <button type="button" disabled={!hydrated || !config.cmpSrc || privacy.status === 'loading' || privacy.status === 'unavailable'} onClick={() => {
      if (config.cmpSrc) {
        setMessage(''); setRequested(true); startGooglePrivacy(config.cmpSrc)
      }
    }}>打开 Google 隐私选择</button>
    <p role="status">{!config.cmpSrc ? '本站尚未启用 Google 隐私消息，广告保持关闭。此入口当前不会修改或保存 Google 选择。' : privacy.status === 'unavailable' ? 'Google 隐私消息暂时不可用，广告保持关闭。请稍后重新加载本页，或使用 Google 的隐私说明与广告设置。' : privacy.status === 'loading' ? '正在连接 Google 隐私消息…' : message || '点击按钮连接 Google 并查看适用的消息。'}</p>
    <div className={styles.links}><a href="https://myadcenter.google.com/" target="_blank" rel="noreferrer">Google 广告设置</a><a href="https://policies.google.com/privacy?hl=zh-CN" target="_blank" rel="noreferrer">Google 隐私说明</a></div>
  </section>
}

export function TutorialAdvertising({ config }: { config: AdvertisingConfig }) {
  const enabled = !!config.adClient && !!config.adSlot && !!config.cmpSrc
  const privacy = useGooglePrivacy(config.cmpSrc, enabled)
  const slotRef = useRef<HTMLModElement>(null)
  const [adState, setAdState] = useState('等待隐私选择，阅读不受影响。')
  useEffect(() => {
    if (!enabled || !privacy.allowed || !slotRef.current) {
      return
    }
    let active = true
    let settled = false
    const fail = () => {
      if (active) {
        settled = true; setAdState('广告未能加载，你可以继续阅读。')
      }
    }
    const initialize = () => {
      if (!active || !slotRef.current || slotRef.current.dataset.oneimgInitialized || slotRef.current.dataset.adsbygoogleStatus) {
        return
      }
      try {
        slotRef.current.dataset.oneimgInitialized = 'true'; const queue = window.adsbygoogle ?? new Array<Record<string, never>>(); window.adsbygoogle = queue; queue.push({})
      } catch {
        fail()
      }
    }
    const observer = new MutationObserver(() => {
      const status = slotRef.current?.getAttribute('data-ad-status')
      if (status) {
        settled = true; setAdState(status === 'filled' ? '' : '暂无广告，你可以继续阅读。')
      }
    })
    observer.observe(slotRef.current, { attributes: true, attributeFilter: ['data-ad-status'] })
    let script = document.getElementById('oneimg-ad-script') as HTMLScriptElement | null
    if (!script) {
      script = document.createElement('script')
      script.id = 'oneimg-ad-script'
      script.async = true
      script.crossOrigin = 'anonymous'
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adClient}`
      script.addEventListener('load', () => {
        script!.dataset.loaded = 'true'
      }, { once: true })
      document.head.appendChild(script)
    }
    script.addEventListener('load', initialize)
    script.addEventListener('error', fail)
    if (script.dataset.loaded === 'true') {
      initialize()
    }
    setAdState('广告加载中，阅读不受影响。')
    const timer = setTimeout(() => {
      if (!settled) {
        fail()
      }
    }, 12000)
    return () => {
      active = false; clearTimeout(timer); observer.disconnect(); script?.removeEventListener('load', initialize); script?.removeEventListener('error', fail)
    }
  }, [enabled, privacy.allowed, config.adClient])
  if (!enabled) {
    return null
  }
  return <aside className={styles.ad} aria-label="广告">
    <div className={styles.adLabel}>广告</div>
    <div className={styles.adSpace}><ins ref={slotRef} className="adsbygoogle" data-ad-client={config.adClient!} data-ad-slot={config.adSlot!} data-ad-format="auto" data-full-width-responsive="true" /></div>
    <div className={styles.adState} role="status">{privacy.status === 'unavailable' ? '隐私消息不可用，未加载广告。' : !privacy.allowed && privacy.status === 'ready' ? '隐私条件尚未满足，未加载广告。' : adState}</div>
  </aside>
}
