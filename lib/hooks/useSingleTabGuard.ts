'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const CHANNEL_NAME = 'saveme_single_tab_channel'
const STORAGE_ACTIVE_TAB_KEY = 'saveme_active_tab_id'
const STORAGE_HEARTBEAT_KEY = 'saveme_tab_heartbeat'
const HEARTBEAT_INTERVAL_MS = 3000
const HEARTBEAT_TIMEOUT_MS = 6000

interface TabMessage {
  type: 'PING' | 'PONG' | 'CLAIM_ACTIVE_TAB' | 'TAB_CLOSED'
  tabId: string
  timestamp: number
}

function getOrCreateTabId(): string {
  if (typeof window === 'undefined') return ''
  let currentTabId = sessionStorage.getItem('saveme_this_tab_id')
  if (!currentTabId) {
    currentTabId = `tab_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    sessionStorage.setItem('saveme_this_tab_id', currentTabId)
  }
  return currentTabId
}

export function useSingleTabGuard() {
  const [isBlocked, setIsBlocked] = useState<boolean>(false)
  const isBlockedRef = useRef<boolean>(false)
  const tabIdRef = useRef<string>('')
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Keep isBlockedRef in sync for event listeners
  useEffect(() => {
    isBlockedRef.current = isBlocked
  }, [isBlocked])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentTabId = getOrCreateTabId()
    tabIdRef.current = currentTabId

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channelRef.current = channel
      } catch (err) {
        console.warn('[SingleTabGuard] BroadcastChannel fallback:', err)
      }
    }

    const updateHeartbeat = () => {
      try {
        localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, currentTabId)
        localStorage.setItem(STORAGE_HEARTBEAT_KEY, String(Date.now()))
      } catch {
        // Ignore storage errors
      }
    }

    const clearActiveTabStorage = () => {
      try {
        const activeTab = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY)
        if (activeTab === currentTabId) {
          localStorage.removeItem(STORAGE_ACTIVE_TAB_KEY)
          localStorage.removeItem(STORAGE_HEARTBEAT_KEY)
        }
      } catch {
        // Ignore storage errors
      }
    }

    let pongReceived = false

    // Message handler for BroadcastChannel
    const handleBroadcastMessage = (event: MessageEvent<TabMessage>) => {
      const { type, tabId } = event.data || {}
      if (!type || tabId === tabIdRef.current) return

      if (type === 'PING') {
        // If this tab is currently the active (unblocked) leader, respond PONG to inform the new tab
        if (!isBlockedRef.current) {
          channel?.postMessage({
            type: 'PONG',
            tabId: currentTabId,
            timestamp: Date.now(),
          })
          updateHeartbeat()
        }
      } else if (type === 'PONG') {
        // Another active tab genuinely exists!
        pongReceived = true
        setIsBlocked(true)
      } else if (type === 'CLAIM_ACTIVE_TAB') {
        // Another tab explicitly claimed leadership
        setIsBlocked(true)
      }
    }

    if (channel) {
      channel.addEventListener('message', handleBroadcastMessage)
    }

    // Storage event handler as fallback
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_ACTIVE_TAB_KEY) {
        const newActiveTabId = event.newValue
        if (newActiveTabId && newActiveTabId !== tabIdRef.current) {
          setIsBlocked(true)
        }
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Probe actively: send PING to detect if another tab is currently alive
    channel?.postMessage({
      type: 'PING',
      tabId: currentTabId,
      timestamp: Date.now(),
    })

    // Give other tabs 150ms to respond to PING
    const probeTimeout = setTimeout(() => {
      if (!pongReceived) {
        // Check localStorage heartbeat as a secondary check
        const storedActiveTab = localStorage.getItem(STORAGE_ACTIVE_TAB_KEY)
        const storedHeartbeat = Number(localStorage.getItem(STORAGE_HEARTBEAT_KEY)) || 0
        const isHeartbeatFresh = Date.now() - storedHeartbeat < HEARTBEAT_TIMEOUT_MS

        if (storedActiveTab && storedActiveTab !== currentTabId && isHeartbeatFresh) {
          // Heartbeat is fresh from another active tab
          setIsBlocked(true)
        } else {
          // No other active tab exists (or previous tab died / closed). Become the active tab!
          setIsBlocked(false)
          updateHeartbeat()
        }
      }
    }, 150)

    // Heartbeat interval: keep active tab record fresh while unblocked
    const heartbeatInterval = setInterval(() => {
      if (!isBlockedRef.current) {
        updateHeartbeat()
      }
    }, HEARTBEAT_INTERVAL_MS)

    // Cleanup when tab closes
    const handleUnload = () => {
      if (!isBlockedRef.current) {
        channel?.postMessage({
          type: 'TAB_CLOSED',
          tabId: currentTabId,
          timestamp: Date.now(),
        })
        clearActiveTabStorage()
      }
    }

    window.addEventListener('beforeunload', handleUnload)
    window.addEventListener('pagehide', handleUnload)

    return () => {
      clearTimeout(probeTimeout)
      clearInterval(heartbeatInterval)
      if (channel) {
        channel.removeEventListener('message', handleBroadcastMessage)
        channel.close()
      }
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('beforeunload', handleUnload)
      window.removeEventListener('pagehide', handleUnload)
    }
  }, [])

  // Explicit action to take over and become the active tab
  const claimActiveTab = useCallback(() => {
    if (typeof window === 'undefined') return
    const myTabId = tabIdRef.current || getOrCreateTabId()

    try {
      localStorage.setItem(STORAGE_ACTIVE_TAB_KEY, myTabId)
      localStorage.setItem(STORAGE_HEARTBEAT_KEY, String(Date.now()))
      const msg: TabMessage = {
        type: 'CLAIM_ACTIVE_TAB',
        tabId: myTabId,
        timestamp: Date.now(),
      }
      channelRef.current?.postMessage(msg)
      setIsBlocked(false)
    } catch (err) {
      console.error('[SingleTabGuard] Error taking over tab:', err)
      setIsBlocked(false)
    }
  }, [])

  return {
    isBlocked,
    claimActiveTab,
  }
}
