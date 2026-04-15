'use client'

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'

interface WebSocketContextType {
  subscribe: (symbol: string, channels: string[]) => void
  unsubscribe: (symbol: string) => void
  lastMessage: any
  isConnected: boolean
}

const WebSocketContext = createContext<WebSocketContextType>({
  subscribe: () => {},
  unsubscribe: () => {},
  lastMessage: null,
  isConnected: false,
})

export const useWebSocketContext = () => useContext(WebSocketContext)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const subscriptionsRef = useRef<Map<string, string[]>>(new Map())

  const sendSubscriptions = () => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    subscriptionsRef.current.forEach((channels, symbol) => {
      wsRef.current!.send(JSON.stringify({ type: 'subscribe', symbol, channels }))
    })
  }

  const connect = () => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001'
    const ws = new WebSocket(`${wsUrl}/market-data`)
    wsRef.current = ws

    ws.onopen = () => {
      setIsConnected(true)
      sendSubscriptions() // resubscribe on every (re)connect
    }

    ws.onmessage = (event) => {
      try {
        setLastMessage(JSON.parse(event.data))
      } catch {}
    }

    ws.onclose = () => {
      setIsConnected(false)
      setTimeout(connect, 3000) // reconnect with fresh handlers
    }

    ws.onerror = () => ws.close()
  }

  useEffect(() => {
    let cancelled = false
    connect()
    return () => {
      cancelled = true
      const ws = wsRef.current
      if (ws && ws.readyState !== WebSocket.CONNECTING) {
        ws.onclose = null // prevent reconnect loop on intentional close
        ws.close()
      } else if (ws) {
        ws.onopen = () => { ws.onclose = null; ws.close() }
      }
    }
  }, [])

  const subscribe = useCallback((symbol: string, channels: string[]) => {
    subscriptionsRef.current.set(symbol, channels)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', symbol, channels }))
    }
    // if not open yet, onopen will call sendSubscriptions() and pick it up
  }, [])

  const unsubscribe = useCallback((symbol: string) => {
    subscriptionsRef.current.delete(symbol)
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', symbol }))
    }
  }, [])

  return (
    <WebSocketContext.Provider value={{ subscribe, unsubscribe, lastMessage, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  )
}
