'use client'

import { useEffect, useRef, useState } from 'react'
import { useWebSocket } from '@/hooks/useWebSocket'

const TICKER_SYMBOLS = ['BTC-USD', 'ETH-USD', 'AAPL', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'NVDA']

interface PriceData {
  price: number
  change: number
  changePercent: number
}

export function LivePriceTicker() {
  const { subscribe, lastMessage, isConnected } = useWebSocket()
  const [prices, setPrices] = useState<Record<string, PriceData>>({})
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!isConnected) { subscribedRef.current = false; return }
    if (subscribedRef.current) return
    subscribedRef.current = true
    TICKER_SYMBOLS.forEach((s) => subscribe(s, ['price']))
  }, [isConnected])

  useEffect(() => {
    if (!lastMessage?.symbol || lastMessage.price == null) return
    setPrices((prev) => ({
      ...prev,
      [lastMessage.symbol]: {
        price: lastMessage.price,
        change: lastMessage.change ?? 0,
        changePercent: lastMessage.changePercent ?? 0,
      },
    }))
  }, [lastMessage])

  // Duplicate items so the scroll loops seamlessly
  const items = [...TICKER_SYMBOLS, ...TICKER_SYMBOLS]

  return (
    <div className="h-8 bg-[#0B1020] border-b border-[#1E2438] overflow-hidden flex items-center">
      <div className="flex animate-ticker whitespace-nowrap">
        {items.map((symbol, i) => {
          const d = prices[symbol]
          const up = d ? d.change >= 0 : null
          return (
            <span key={i} className="inline-flex items-center gap-1.5 px-5 text-xs">
              <span className="text-gray-300 font-medium">{symbol}</span>
              <span className="text-white">{d ? `$${d.price.toFixed(2)}` : '—'}</span>
              {d && (
                <span className={up ? 'text-green-400' : 'text-red-400'}>
                  {up ? '▲' : '▼'} {Math.abs(d.changePercent).toFixed(2)}%
                </span>
              )}
            </span>
          )
        })}
      </div>
    </div>
  )
}
