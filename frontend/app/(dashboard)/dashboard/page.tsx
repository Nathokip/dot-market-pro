"use client";

import TradingViewChart from "@/components/charts/tradingview-chart";
import SentimentChart from "@/components/charts/sentiment-chart";
import { fetchPrediction, Prediction } from "@/lib/api";
import { useEffect, useState, useRef, useCallback } from "react";
import { useWebSocketContext } from "@/components/providers/WebSocketProvider";

const DEFAULT_TICKER = "BTC-USD";
const POPULAR_TICKERS = ["BTC-USD", "ETH-USD", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA", "Custom…"];

export default function Dashboard() {
  const [ticker, setTicker] = useState(DEFAULT_TICKER);
  const [selected, setSelected] = useState(DEFAULT_TICKER);
  const [customInput, setCustomInput] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [data, setData] = useState<Prediction | null>(null);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [priceChangePercent, setPriceChangePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { subscribe, unsubscribe, lastMessage, isConnected } = useWebSocketContext();
  const subscribedTickerRef = useRef<string | null>(null);
  const isSubscribedRef = useRef<boolean>(false);

  // Stable subscribe/unsubscribe handlers
  const handleSubscribe = useCallback((sym: string) => {
    if (isSubscribedRef.current && subscribedTickerRef.current === sym) return;
    if (subscribedTickerRef.current && subscribedTickerRef.current !== sym) {
      unsubscribe(subscribedTickerRef.current);
    }
    subscribe(sym, ["price"]);
    subscribedTickerRef.current = sym;
    isSubscribedRef.current = true;
  }, [subscribe, unsubscribe]);

  // Subscribe when connected
  useEffect(() => {
    if (!isConnected) return;
    handleSubscribe(ticker);
  }, [isConnected, ticker, handleSubscribe]);

  // Update live price from WebSocket with debug logging
  useEffect(() => {
    if (!lastMessage) return;
    if (lastMessage.symbol === ticker) {
      setLivePrice(lastMessage.price ?? null);
      setPriceChange(lastMessage.change ?? null);
      setPriceChangePercent(lastMessage.changePercent ?? null);
    }
  }, [lastMessage, ticker]);

  // Fetch ML prediction on ticker change, then refresh every minute
  useEffect(() => {
    setData(null);
    setError(false);
    setLoading(true);
    isSubscribedRef.current = false;

    const run = () => {
      fetchPrediction(ticker)
        .then(setData)
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    };

    run();
    const interval = setInterval(run, 60 * 1000);
    return () => clearInterval(interval);
  }, [ticker]);

  const trend = data?.trend_direction === "Uptrend" ? "Bullish" : "Bearish";
  const displayPrice = livePrice ?? data?.historical_chart_data.at(-1) ?? null;

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === "Custom…") {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      setSelected(val);
      setTicker(val);
      setLivePrice(null);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = customInput.trim().toUpperCase();
    if (t) { setTicker(t); setSelected(t); setLivePrice(null); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Market Prediction Dashboard</h1>
          <p className="text-gray-400">AI-driven insights and forecasts</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs px-2 py-1 rounded-full ${isConnected ? "bg-green-900 text-green-400" : "bg-gray-800 text-gray-500"}`}>
            {isConnected ? "● Live" : "○ Offline"}
          </span>
          <select
            value={POPULAR_TICKERS.includes(selected) ? selected : "Custom…"}
            onChange={handleSelect}
            className="px-3 py-1.5 rounded-md bg-[#121833] border border-[#1E2438] text-white text-sm outline-none focus:border-cyan-500 cursor-pointer"
          >
            {POPULAR_TICKERS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          {showCustom && (
            <form onSubmit={handleCustomSubmit} className="flex gap-2">
              <input
                autoFocus
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
                className="w-24 px-3 py-1.5 rounded-md bg-[#121833] border border-[#1E2438] text-white text-sm outline-none focus:border-cyan-500"
                placeholder="e.g. NFLX"
              />
              <button type="submit" className="px-3 py-1.5 bg-cyan-500 text-white rounded-md text-sm hover:bg-cyan-600">
                Go
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#121833] p-4 rounded-xl">
          <p className="text-gray-400 text-sm">Current Price</p>
          <h2 className="text-xl font-bold">
            {displayPrice != null ? `$${displayPrice.toFixed(2)}` : loading ? "…" : "—"}
          </h2>
          {priceChange != null && (
            <p className={`text-xs mt-1 ${priceChange >= 0 ? "text-green-400" : "text-red-400"}`}>
              {priceChange >= 0 ? "+" : ""}{priceChange.toFixed(2)} ({priceChangePercent?.toFixed(2)}%)
            </p>
          )}
        </div>
        <div className="bg-[#121833] p-4 rounded-xl">
          <p className="text-gray-400 text-sm">Predicted Price</p>
          <h2 className="text-xl font-bold text-green-400">
            {data ? `$${data.forecasted_price.toFixed(2)}` : loading ? "…" : "—"}
          </h2>
        </div>
        <div className="bg-[#121833] p-4 rounded-xl">
          <p className="text-gray-400 text-sm">Target Date</p>
          <h2 className="text-xl font-bold">{data?.target_date ?? (loading ? "…" : "—")}</h2>
        </div>
        <div className="bg-[#121833] p-4 rounded-xl">
          <p className="text-gray-400 text-sm">Trend</p>
          <h2 className={`text-xl font-bold ${trend === "Bullish" ? "text-green-400" : "text-red-400"}`}>
            {data ? trend : loading ? "…" : "—"}
          </h2>
          {data?.probability != null && (
            <p className="text-xs text-gray-400 mt-1">Confidence: {(data.probability * 100).toFixed(1)}%</p>
          )}
        </div>
      </div>

      {error && (
        <p className="text-red-400 text-sm">⚠ Could not reach ML API. Ensure the prediction server is running.</p>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#121833] p-4 rounded-xl">
          <TradingViewChart symbol={ticker} />
        </div>
        <div className="space-y-6">
          <div className="bg-[#121833] p-4 rounded-xl">
            <h3 className="mb-2 font-semibold">AI Prediction — {ticker}</h3>
            <p className="text-sm text-gray-400">Trend: <span className={trend === "Bullish" ? "text-green-400" : "text-red-400"}>{data ? trend : "—"}</span></p>
            <p className="text-sm text-gray-400">Forecast: <span className="text-white">{data ? `$${data.forecasted_price.toFixed(2)}` : "—"}</span></p>
            {data?.rmse != null && <p className="text-sm text-gray-400">RMSE: <span className="text-white">{data.rmse.toFixed(4)}</span></p>}
            {data && (
              <p className="mt-3 font-bold text-cyan-400">
                SIGNAL: {trend === "Bullish" ? "BUY" : "SELL"}
              </p>
            )}
          </div>
          <div className="bg-[#121833] p-4 rounded-xl">
            <h3 className="mb-2 font-semibold">Market Sentiment</h3>
            <SentimentChart
                forecasted={data?.forecasted_price}
                current={displayPrice ?? undefined}
                trend={data?.trend_direction}
              />
          </div>
        </div>
      </div>
    </div>
  );
}
