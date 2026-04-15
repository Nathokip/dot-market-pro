"use client";
import { useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import { fetchBacktest, BacktestResult } from "@/lib/api";

const Backtesting = () => {
  const [symbol, setSymbol] = useState("BTC-USD");
  const [days, setDays] = useState(30);
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<BacktestResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setRunning(true);
    setError(null);
    setResults(null);
    try {
      const data = await fetchBacktest(symbol.trim().toUpperCase(), days);
      setResults(data);
    } catch (e: any) {
      setError(e.message ?? "Backtest failed");
    } finally {
      setRunning(false);
    }
  };

  // Sample every Nth point so the chart isn't too dense
  const chartData = results
    ? results.data.filter((_, i) => i % Math.max(1, Math.floor(results.data.length / 120)) === 0)
    : [];

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Backtesting</h1>
        <p className="text-sm text-muted-foreground">LSTM model tested on real historical hourly data</p>
      </div>

      <div className="bg-[#121833] border border-[#1E2438] rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Configuration</h3>
        <div className="grid sm:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Symbol</label>
            <Input
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              className="h-10 bg-[#0B1020] border-[#1E2438] text-white"
              placeholder="BTC-USD"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Lookback (days)</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="w-full h-10 bg-[#0B1020] border border-[#1E2438] rounded-md px-3 text-sm text-white"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Model</label>
            <select className="w-full h-10 bg-[#0B1020] border border-[#1E2438] rounded-md px-3 text-sm text-white">
              <option>LSTM Neural Network</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={runBacktest}
              disabled={running}
              className="w-full h-10 bg-cyan-500 hover:bg-cyan-600 text-white"
            >
              {running ? "Running…" : "Run Backtest"}
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-red-400 text-sm mb-4">⚠ {error}</p>}

      {running && (
        <div className="text-center py-12 text-gray-400 text-sm">
          Fetching real data and running LSTM inference… this may take 20–40s
        </div>
      )}

      {results && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-[#121833] border border-[#1E2438] rounded-xl p-5">
              <div className="text-sm text-gray-400">MAPE (Error)</div>
              <div className="text-2xl font-bold text-white">{results.mape}%</div>
              <div className="text-xs text-gray-500 mt-1">Mean Absolute % Error</div>
            </div>
            <div className="bg-[#121833] border border-[#1E2438] rounded-xl p-5">
              <div className="text-sm text-gray-400">Direction Accuracy</div>
              <div className={`text-2xl font-bold ${results.win_rate >= 50 ? "text-green-400" : "text-red-400"}`}>
                {results.win_rate}%
              </div>
              <div className="text-xs text-gray-500 mt-1">Correct trend direction</div>
            </div>
            <div className="bg-[#121833] border border-[#1E2438] rounded-xl p-5">
              <div className="text-sm text-gray-400">Candles Tested</div>
              <div className="text-2xl font-bold text-white">{results.total}</div>
              <div className="text-xs text-gray-500 mt-1">Hourly candles (real data)</div>
            </div>
          </div>

          <div className="bg-[#121833] border border-[#1E2438] rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              Predicted vs Actual — {results.ticker} ({days}d hourly)
            </h3>
            <ResponsiveContainer width="100%" height={380}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1E2438" />
                <XAxis dataKey="index" tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `H${v}`} interval={Math.floor(chartData.length / 8)} />
                <YAxis tick={{ fill: "#6b7280", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v.toLocaleString()}`} width={80} />
                <Tooltip
                  contentStyle={{ background: "#0B1020", border: "1px solid #1E2438", borderRadius: 8 }}
                  labelStyle={{ color: "#9ca3af" }}
                  formatter={(v: number) => [`$${v.toLocaleString()}`, ""]}
                />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize: 12 }} />
                <Line type="monotone" dataKey="actual" stroke="#ffffff" strokeWidth={2} dot={false} name="Actual" />
                <Line type="monotone" dataKey="predicted" stroke="#00C2FF" strokeWidth={2} strokeDasharray="5 3" dot={false} name="Predicted" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default Backtesting;
