const ML_API = process.env.NEXT_PUBLIC_ML_API_URL || 'http://localhost:8000'

export interface Prediction {
  ticker: string
  target_date: string
  target_time: string
  forecasted_price: number
  trend_direction: 'Uptrend' | 'Downtrend'
  historical_chart_data: number[]
  rmse: number | null
  probability: number | null
  prediction_minutes?: number
}

export async function fetchPrediction(ticker: string, minutes = 5): Promise<Prediction> {
  const res = await fetch(`${ML_API}/api/predict/${ticker}?minutes=${minutes}`)
  if (!res.ok) throw new Error(`Prediction failed for ${ticker}: ${res.statusText}`)
  return res.json()
}

export interface BacktestResult {
  ticker: string
  data: { index: number; actual: number; predicted: number }[]
  mape: number
  win_rate: number
  total: number
}

export async function fetchBacktest(ticker: string, days = 30): Promise<BacktestResult> {
  const res = await fetch(`${ML_API}/api/backtest/${ticker}?days=${days}`)
  if (!res.ok) throw new Error(`Backtest failed: ${res.statusText}`)
  return res.json()
}

export async function fetchMultiplePredictions(tickers: string[]): Promise<Prediction[]> {
  const results = await Promise.allSettled(tickers.map(fetchPrediction))
  return results
    .filter((r): r is PromiseFulfilledResult<Prediction> => r.status === 'fulfilled')
    .map((r) => r.value)
}
