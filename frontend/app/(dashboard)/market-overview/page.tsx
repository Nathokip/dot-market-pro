"use client";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { fetchMultiplePredictions, Prediction } from "@/lib/api";
import { ArrowUp, ArrowDown } from "lucide-react";
import { useEffect, useState } from "react";

const TICKERS = ["AAPL", "MSFT", "GOOGL", "TSLA", "AMZN"];

const NAMES: Record<string, string> = {
  AAPL: "Apple Inc.",
  MSFT: "Microsoft Corp.",
  GOOGL: "Alphabet Inc.",
  TSLA: "Tesla Inc.",
  AMZN: "Amazon.com Inc.",
};

const Market = () => {
  const [stocks, setStocks] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMultiplePredictions(TICKERS)
      .then(setStocks)
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Market</h1>
        <p className="text-sm text-muted-foreground">Live market overview and top movers</p>
      </div>

      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Top Stocks</h3>
        {loading ? (
          <p className="text-muted-foreground text-sm">Loading live data…</p>
        ) : (
          <div className="grid gap-4">
            {stocks.map((stock) => {
              const currentPrice = stock.historical_chart_data.at(-1) ?? 0;
              const isUp = stock.trend_direction === "Uptrend";
              return (
                <div key={stock.ticker} className="bg-muted/20 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-foreground">{stock.ticker}</div>
                    <div className="text-sm text-muted-foreground">{NAMES[stock.ticker] ?? stock.ticker}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUp ? <ArrowUp className="h-4 w-4 text-green-400" /> : <ArrowDown className="h-4 w-4 text-red-400" />}
                    <span className="font-semibold text-foreground">${currentPrice.toFixed(2)}</span>
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

export default Market;
