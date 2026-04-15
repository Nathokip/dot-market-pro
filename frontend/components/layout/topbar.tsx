"use client";

export default function Topbar() {
  return (
    <div className="h-16 bg-[#121833] flex items-center justify-between px-6 border-b border-gray-800">
      
      <input
        placeholder="Search stocks (AAPL, TSLA...)"
        className="bg-[#0B1020] px-4 py-2 rounded w-1/3"
      />

      <div className="flex items-center gap-4">
        <div className="w-8 h-8 bg-gray-500 rounded-full" />
      </div>
    </div>
  );
}