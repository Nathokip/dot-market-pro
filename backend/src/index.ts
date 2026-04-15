import { setDefaultResultOrder } from 'dns'
setDefaultResultOrder('ipv4first')
import 'dotenv/config'

import { WebSocketServer, WebSocket } from 'ws'
import { IncomingMessage } from 'http'

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || ''
const PORT = 3001
const POLL_INTERVAL_MS = 60000 // 60s = 1 call/min per symbol (stays under 60/min limit)

const subscriptions = new Map<string, Set<WebSocket>>()
const pollers = new Map<string, ReturnType<typeof setInterval>>()

// Map yfinance-style symbols to Finnhub symbols
const SYMBOL_MAP: Record<string, string> = {
  'BTC-USD': 'BINANCE:BTCUSDT',
  'ETH-USD': 'BINANCE:ETHUSDT',
  'BNB-USD': 'BINANCE:BNBUSDT',
  'SOL-USD': 'BINANCE:SOLUSDT',
}

function toFinnhubSymbol(symbol: string): string {
  return SYMBOL_MAP[symbol] ?? symbol
}

async function fetchAndBroadcast(symbol: string) {
  try {
    const finnhubSymbol = toFinnhubSymbol(symbol)
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${finnhubSymbol}&token=${FINNHUB_KEY}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data: any = await res.json()
    if (!data.c) return

    console.log(`[poller] Fetched ${symbol}: price=${data.c} change=${data.d} dp=${data.dp} volume=${data.v ?? 'null'}`)

    const payload = JSON.stringify({
      symbol,
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      volume: data.v ?? null,
      time: Date.now(),
    })

    // Log the payload being broadcast for easier debugging
    console.log(`[poller] Broadcasting ${symbol}:`, payload)

    subscriptions.get(symbol)?.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) client.send(payload)
    })
  } catch (err) {
    console.error(`[poller] Error fetching ${symbol}:`, err)
  }
}

function startPoller(symbol: string) {
  if (pollers.has(symbol)) return
  // Stagger initial fetches by 1s per symbol to avoid burst rate limiting
  const delay = pollers.size * 1000
  setTimeout(() => fetchAndBroadcast(symbol), delay)
  const interval = setInterval(() => fetchAndBroadcast(symbol), POLL_INTERVAL_MS)
  pollers.set(symbol, interval)
}

function stopPoller(symbol: string) {
  const interval = pollers.get(symbol)
  if (interval) {
    clearInterval(interval)
    pollers.delete(symbol)
  }
}

function addSubscription(symbol: string, client: WebSocket) {
  if (!subscriptions.has(symbol)) {
    subscriptions.set(symbol, new Set())
  }
  subscriptions.get(symbol)!.add(client)
  startPoller(symbol)
}

function removeSubscription(symbol: string, client: WebSocket) {
  const clients = subscriptions.get(symbol)
  if (!clients) return
  clients.delete(client)
  if (clients.size === 0) {
    subscriptions.delete(symbol)
    stopPoller(symbol)
  }
}

function removeAllSubscriptions(client: WebSocket) {
  subscriptions.forEach((clients, symbol) => {
    clients.delete(client)
    if (clients.size === 0) {
      subscriptions.delete(symbol)
      stopPoller(symbol)
    }
  })
}

const wss = new WebSocketServer({ port: PORT, path: '/market-data' })

wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
  console.log('[ws] Client connected')

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString())

      if (msg.type === 'subscribe' && msg.symbol) {
        addSubscription(msg.symbol.toUpperCase(), ws)
        console.log(`[ws] Subscribed to ${msg.symbol}`)
      } else if (msg.type === 'unsubscribe' && msg.symbol) {
        removeSubscription(msg.symbol.toUpperCase(), ws)
        console.log(`[ws] Unsubscribed from ${msg.symbol}`)
      }
    } catch {
      console.error('[ws] Invalid message received')
    }
  })

  ws.on('close', () => {
    removeAllSubscriptions(ws)
    console.log('[ws] Client disconnected')
  })
})

console.log(`[ws] WebSocket server running on ws://localhost:${PORT}/market-data`)
