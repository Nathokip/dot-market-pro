'use client'

import React, { useEffect, useRef, useState, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Maximize2, Minimize2, RefreshCw } from 'lucide-react'
import { useWebSocketContext } from '@/components/providers/WebSocketProvider'

declare global {
  interface Window {
    TradingView: any
  }
}

interface TradingChartProps {
  symbol: string
  onTimeframeChange?: (timeframe: string) => void
}

type TimeFrame = '1D' | '1W' | '1M' | '3M' | '1Y' | 'ALL'

export function TradingChart({ symbol, onTimeframeChange }: TradingChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTimeframe, setActiveTimeframe] = useState<TimeFrame>('1M')
  const { subscribe, unsubscribe, lastMessage, isConnected } = useWebSocketContext()
  const symbolRef = useRef(symbol)
  const subscribedRef = useRef(false)

  const timeframes: TimeFrame[] = ['1D', '1W', '1M', '3M', '1Y', 'ALL']

  const getInterval = (timeframe: TimeFrame): string => {
    const intervals: Record<TimeFrame, string> = {
      '1D': '5',
      '1W': '15',
      '1M': '60',
      '3M': 'D',
      '1Y': 'W',
      'ALL': 'M'
    }
    return intervals[timeframe]
  }

  useEffect(() => {
    symbolRef.current = symbol
  }, [symbol])

  // Subscribe to WebSocket for live price updates
  useEffect(() => {
    if (!isConnected || subscribedRef.current) return
    subscribedRef.current = true
    subscribe(symbol, ['price'])
    return () => {
      unsubscribe(symbol)
      subscribedRef.current = false
    }
  }, [isConnected, symbol, subscribe, unsubscribe])

  // Initialize TradingView widget — re-runs on symbol or timeframe change
  useEffect(() => {
    if (!chartContainerRef.current) return

    // Assign stable ID once
    if (!chartContainerRef.current.id) {
      chartContainerRef.current.id = `tv_${Math.random().toString(36).substr(2, 9)}`
    }
    const containerId = chartContainerRef.current.id

    setIsLoading(true)

    // Destroy previous widget
    if (widgetRef.current) {
      try { widgetRef.current.remove() } catch {}
      widgetRef.current = null
    }
    chartContainerRef.current.innerHTML = ''

    let destroyed = false

    const initWidget = () => {
      if (destroyed || !chartContainerRef.current || !window.TradingView) return
      const widget = new window.TradingView.widget({
        autosize: true,
        symbol: symbol,
        interval: getInterval(activeTimeframe),
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: containerId,
        disabled_features: ['use_localstorage_for_settings'],
      })
      widgetRef.current = widget
      try {
        widget.onChartReady(() => { if (!destroyed) setIsLoading(false) })
      } catch {
        setIsLoading(false)
      }
    }

    const timeout = setTimeout(() => { if (!destroyed) setIsLoading(false) }, 8000)

    if (window.TradingView) {
      initWidget()
    } else if (!document.querySelector('script[src="https://s3.tradingview.com/tv.js"]')) {
      const script = document.createElement('script')
      script.src = 'https://s3.tradingview.com/tv.js'
      script.async = true
      script.onload = initWidget
      script.onerror = () => setIsLoading(false)
      document.head.appendChild(script)
    } else {
      const poll = setInterval(() => {
        if (window.TradingView) { clearInterval(poll); initWidget() }
      }, 100)
    }

    return () => {
      destroyed = true
      clearTimeout(timeout)
      if (widgetRef.current) {
        try { widgetRef.current.remove() } catch {}
        widgetRef.current = null
      }
    }
  }, [symbol, activeTimeframe])

  const handleTimeframeChange = (timeframe: TimeFrame) => {
    setActiveTimeframe(timeframe)
    onTimeframeChange?.(timeframe)
  }



  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      chartContainerRef.current?.parentElement?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // Add AI prediction overlay
  const addPredictionOverlay = async (predictions: any[]) => {
    if (!widgetRef.current) return

    // Add custom shape for predictions
    const chart = widgetRef.current.chart()
    const shapes = chart.shapes()
    
    // Clear existing prediction shapes
    shapes.forEach((shape: any) => {
      if (shape.getProperties().name === 'ai_prediction') {
        shapes.remove(shape)
      }
    })

    // Add prediction points
    predictions.forEach((pred, index) => {
      shapes.add('circle', {
        time: pred.date,
        price: pred.price,
        name: 'ai_prediction',
        color: '#00C2FF',
        size: 8,
        tooltip: `AI Prediction: $${pred.price} (Confidence: ${pred.confidence}%)`
      })
    })
  }

  // Export chart as image
  const exportChart = () => {
    if (widgetRef.current) {
      const chart = widgetRef.current.chart()
      chart.takeScreenshot()
    }
  }

  return (
    <Card className="relative bg-[#121833] border-[#1E2438] overflow-hidden">
      {/* Header with controls */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-[#0B1020] to-transparent p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-semibold">{symbol}</span>
            <span className="text-xs text-gray-400">NASDAQ</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Timeframe buttons */}
            <div className="flex items-center gap-1 bg-[#0B1020] rounded-lg p-1">
              {timeframes.map((tf) => (
                <Button
                  key={tf}
                  variant={activeTimeframe === tf ? 'default' : 'ghost'}
                  size="sm"
                  className={`h-8 px-3 text-xs ${
                    activeTimeframe === tf 
                      ? 'bg-[#00C2FF] text-white hover:bg-[#00C2FF]/90' 
                      : 'text-gray-400 hover:text-white hover:bg-[#1E2438]'
                  }`}
                  onClick={() => handleTimeframeChange(tf)}
                >
                  {tf}
                </Button>
              ))}
            </div>

            {/* Control buttons */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1E2438]"
              onClick={exportChart}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#1E2438]"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0B1020]/90 z-20">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-[#00C2FF] mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading chart...</p>
          </div>
        </div>
      )}

      {/* Chart container */}
      <div 
        ref={chartContainerRef} 
        className="w-full h-[600px]"
        style={{ minHeight: '500px' }}
      />
    </Card>
  )
}