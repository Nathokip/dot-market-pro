"use client";
import { useState, useRef, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { TradingChart } from "@/components/dashboard/TradingChart";

const POPULAR = ["BTC-USD", "ETH-USD", "AAPL", "TSLA", "MSFT", "GOOGL", "AMZN", "NVDA"];

type LogLine = { text: string; type: "input" | "info" | "error" | "success" };

export default function TradingPage() {
  const [symbol, setSymbol] = useState("BTC-USD");
  const [input, setInput] = useState("");
  const [log, setLog] = useState<LogLine[]>([
    { text: "dot-market terminal v1.0", type: "info" },
    { text: 'Type a ticker symbol and press Enter. Try "track TSLA" or just "TSLA".', type: "info" },
    { text: `Currently tracking: BTC-USD`, type: "success" },
  ]);
  const inputRef = useRef<HTMLInputElement>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logRef.current?.scrollTo(0, logRef.current.scrollHeight);
  }, [log]);

  const push = (text: string, type: LogLine["type"] = "info") =>
    setLog((prev) => [...prev, { text, type }]);

  const handleCommand = (raw: string) => {
    const cmd = raw.trim();
    if (!cmd) return;
    push(`> ${cmd}`, "input");

    const ticker = cmd.replace(/^track\s+/i, "").toUpperCase();

    if (ticker === "HELP") {
      push("Commands: <TICKER>  |  track <TICKER>  |  clear  |  list", "info");
    } else if (ticker === "CLEAR") {
      setLog([]);
    } else if (ticker === "LIST") {
      push(`Popular: ${POPULAR.join(", ")}`, "info");
    } else if (/^[A-Z.\-]{1,10}$/.test(ticker)) {
      setSymbol(ticker);
      push(`Now tracking: ${ticker}`, "success");
    } else {
      push(`Unknown command: "${cmd}". Type HELP for usage.`, "error");
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-white">Trading</h1>
        <p className="text-sm text-gray-400">Live market charts and trade execution</p>
      </div>

      {/* Terminal */}
      <div
        className="mb-4 rounded-lg border border-[#1E2438] bg-[#0B1020] font-mono text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex items-center gap-2 border-b border-[#1E2438] px-4 py-2">
          <span className="h-3 w-3 rounded-full bg-red-500" />
          <span className="h-3 w-3 rounded-full bg-yellow-500" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-gray-500">market-terminal — {symbol}</span>
        </div>

        <div ref={logRef} className="h-36 overflow-y-auto px-4 py-2 space-y-0.5">
          {log.map((line, i) => (
            <div
              key={i}
              className={
                line.type === "input"
                  ? "text-[#00C2FF]"
                  : line.type === "error"
                  ? "text-red-400"
                  : line.type === "success"
                  ? "text-green-400"
                  : "text-gray-400"
              }
            >
              {line.text}
            </div>
          ))}
        </div>

        <div className="flex items-center border-t border-[#1E2438] px-4 py-2 gap-2">
          <span className="text-[#00C2FF]">$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={onKeyDown}
            className="flex-1 bg-transparent text-white outline-none placeholder-gray-600"
            placeholder="TSLA"
            autoFocus
            spellCheck={false}
          />
        </div>
      </div>

      {/* Quick-pick chips */}
      <div className="mb-4 flex flex-wrap gap-2">
        {POPULAR.map((s) => (
          <button
            key={s}
            onClick={() => { setSymbol(s); push(`> ${s}`, "input"); push(`Now tracking: ${s}`, "success"); }}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              symbol === s
                ? "bg-[#00C2FF] border-[#00C2FF] text-white"
                : "border-[#1E2438] text-gray-400 hover:border-[#00C2FF] hover:text-white"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <TradingChart symbol={symbol} />
    </DashboardLayout>
  );
}
