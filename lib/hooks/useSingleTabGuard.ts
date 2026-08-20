'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

const CHANNEL_NAME = 'saveme_single_tab_channel'
const STORAGE_KEY = 'saveme_active_tab_id'

interface TabMessage {
  type: 'CLAIM_ACTIVE_TAB' | 'RELEASE_TAB'
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
  const [isBlocked, setIsBlocked] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const currentTabId = getOrCreateTabId()
    const activeTab = localStorage.getItem(STORAGE_KEY)
    return Boolean(activeTab && activeTab !== currentTabId)
  })

  const tabIdRef = useRef<string>('')
  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const currentTabId = getOrCreateTabId()
    tabIdRef.current = currentTabId

    // BroadcastChannel setup
    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        channel = new BroadcastChannel(CHANNEL_NAME)
        channelRef.current = channel
      } catch (err) {
        console.warn('[SingleTabGuard] BroadcastChannel fallback:', err)
      }
    }

    // Function to claim this tab as the active leader
    const claimTab = () => {
      try {
        localStorage.setItem(STORAGE_KEY, currentTabId)
        const msg: TabMessage = {
          type: 'CLAIM_ACTIVE_TAB',
          tabId: currentTabId,
          timestamp: Date.now(),
        }
        channel?.postMessage(msg)
      } catch (err) {
        console.error('[SingleTabGuard] Error claiming tab:', err)
      }
    }

    // If this tab was not blocked upon initial state check, claim it
    const activeTab = localStorage.getItem(STORAGE_KEY)
    if (!activeTab || activeTab === currentTabId) {
      claimTab()
    }

    // Message handler for BroadcastChannel
    const handleBroadcastMessage = (event: MessageEvent<TabMessage>) => {
      const { type, tabId } = event.data || {}
      if (type === 'CLAIM_ACTIVE_TAB' && tabId !== tabIdRef.current) {
        setIsBlocked(true)
      }
    }

    // Fallback for storage event (cross-tab event in same origin)
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        const newActiveTabId = event.newValue
        if (newActiveTabId && newActiveTabId !== tabIdRef.current) {
          setIsBlocked(true)
        }
      }
    }

    if (channel) {
      channel.addEventListener('message', handleBroadcastMessage)
    }
    window.addEventListener('storage', handleStorageChange)

    return () => {
      if (channel) {
        channel.removeEventListener('message', handleBroadcastMessage)
        channel.close()
      }
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  // Explicit action to take over and become the active tab
  const claimActiveTab = useCallback(() => {
    if (typeof window === 'undefined') return
    const myTabId = tabIdRef.current || getOrCreateTabId()

    try {
      localStorage.setItem(STORAGE_KEY, myTabId)
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
