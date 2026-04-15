import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { TradeHistory } from "@/components/trading/TradeHistory";

export default function TradeHistoryPage() {
  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Trade History</h1>
        <p className="text-sm text-gray-400">Review all your past trades and performance</p>
      </div>
      <TradeHistory />
    </DashboardLayout>
  );
}
