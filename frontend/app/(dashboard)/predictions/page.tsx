"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchMultiplePredictions, Prediction } from "@/lib/api";
import { ArrowUp, ArrowDown, Brain, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

const TICKERS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN", "BTC-USD", "ETH-USD"];

const NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
  "BTC-USD": "Bitcoin USD",
  "ETH-USD": "Ethereum USD",
};

const Predictions = () => {
  const [stocks, setStocks] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = () => {
    fetchMultiplePredictions(TICKERS)
      .then(setStocks)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPredictions();
    const interval = setInterval(fetchPredictions, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">AI Predictions</h1>
        <p className="text-sm text-muted-foreground">Machine learning forecasts across your watchlist</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <div className="glass-card p-5">
          <Brain className="h-5 w-5 text-primary mb-2" />
          <div className="text-sm text-muted-foreground">Model</div>
          <div className="text-2xl font-bold text-foreground">LSTM</div>
        </div>
        <div className="glass-card p-5">
          <Target className="h-5 w-5 text-bullish mb-2" />
          <div className="text-sm text-muted-foreground">Stocks Tracked</div>
          <div className="text-2xl font-bold text-foreground">{stocks.length}</div>
        </div>
        <div className="glass-card p-5">
          <TrendingUp className="h-5 w-5 text-primary mb-2" />
          <div className="text-sm text-muted-foreground">Bullish Signals</div>
          <div className="text-2xl font-bold text-foreground">
            {stocks.filter((s) => s.trend_direction === "Uptrend").length}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">All Predictions</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading live predictions…</p>
        ) : (
          <div className="grid gap-4">
            {stocks.map((stock) => {
              const currentPrice = stock.historical_chart_data.at(-1) ?? 0;
              const priceDiff = stock.forecasted_price - currentPrice;
              const pctDiff = currentPrice ? ((priceDiff / currentPrice) * 100).toFixed(2) : "0.00";
              const isUp = stock.trend_direction === "Uptrend";
              return (
                <div key={stock.ticker} className="bg-muted/20 rounded-xl p-5 flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isUp ? "bg-bullish/10" : "bg-bearish/10"}`}>
                      {isUp ? <ArrowUp className="h-6 w-6 text-bullish" /> : <ArrowDown className="h-6 w-6 text-bearish" />}
                    </div>
                    <div>
                      <div className="font-semibold text-foreground">{stock.ticker}</div>
                      <div className="text-sm text-muted-foreground">{NAMES[stock.ticker] ?? stock.ticker}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Current</div>
                      <div className="text-sm font-semibold text-foreground">${currentPrice.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Predicted</div>
                      <div className="text-sm font-semibold text-primary">${stock.forecasted_price.toFixed(2)}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Change</div>
                      <div className={`text-sm font-semibold ${priceDiff >= 0 ? "text-bullish" : "text-bearish"}`}>
                        {priceDiff >= 0 ? "+" : ""}{pctDiff}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Target Date</div>
                      <div className="text-sm font-semibold text-foreground">{stock.target_date}</div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${isUp ? "bg-bullish/20 text-bullish" : "bg-bearish/20 text-bearish"}`}>
                      {isUp ? "BUY" : "SELL"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Predictions;
