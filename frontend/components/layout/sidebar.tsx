"use client";

import Link from "next/link";

export default function Sidebar() {
  return (
    <div className="w-64 bg-[#121833] p-6 flex flex-col justify-between">
      
      <div>
        <h1 className="text-xl font-bold mb-8 text-cyan-400">
          DOT-MARKET
        </h1>

        <nav className="space-y-4 text-gray-300">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/market">Market Overview</Link>
          <Link href="/predictions">Predictions</Link>
          <Link href="/portfolio">Portfolio</Link>
          <Link href="/insights">AI Insights</Link>
          <Link href="/backtesting">Backtesting</Link>
        </nav>
      </div>

      <div className="bg-[#0B1020] p-4 rounded-xl text-center">
        <p className="text-sm">Upgrade to Pro</p>
        <button className="mt-2 bg-cyan-400 text-black px-3 py-1 rounded">
          Upgrade
        </button>
      </div>
    </div>
  );
}