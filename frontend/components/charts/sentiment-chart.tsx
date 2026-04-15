"use client";

import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

interface SentimentChartProps {
  forecasted?: number;
  current?: number;
  trend?: string;
}

const COLORS = ["#1ED760", "#94a3b8", "#FF4D4F"];

export default function SentimentChart({ forecasted, current, trend }: SentimentChartProps) {
  // Derive sentiment from prediction data if available
  let positive = 60, neutral = 25, negative = 15;

  if (forecasted != null && current != null && current > 0) {
    const changePct = ((forecasted - current) / current) * 100;
    if (trend === "Uptrend") {
      positive = Math.min(90, 50 + Math.abs(changePct) * 5);
      negative = Math.max(5, 20 - Math.abs(changePct) * 2);
    } else {
      negative = Math.min(90, 50 + Math.abs(changePct) * 5);
      positive = Math.max(5, 20 - Math.abs(changePct) * 2);
    }
    neutral = Math.max(5, 100 - positive - negative);
  }

  const data = [
    { name: "Bullish", value: Math.round(positive) },
    { name: "Neutral", value: Math.round(neutral) },
    { name: "Bearish", value: Math.round(negative) },
  ];

  const dominant = data.reduce((a, b) => (a.value > b.value ? a : b));

  return (
    <div className="flex flex-col items-center">
      <PieChart width={200} height={200}>
        <Pie data={data} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={3}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`${value}%`, ""]}
          contentStyle={{ background: "#121833", border: "1px solid #1E2438", borderRadius: 8 }}
          labelStyle={{ color: "#fff" }}
        />
      </PieChart>
      <div className="flex gap-3 mt-1 text-xs">
        {data.map((d, i) => (
          <span key={i} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: COLORS[i] }} />
            <span className="text-gray-400">{d.name}</span>
            <span className="text-white font-medium">{d.value}%</span>
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs font-semibold" style={{ color: COLORS[data.indexOf(dominant)] }}>
        Market leaning: {dominant.name}
      </p>
    </div>
  );
}
