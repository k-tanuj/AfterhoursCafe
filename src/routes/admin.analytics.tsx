import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getDashboardStats, getMonthlyAnalytics, getTopSellingItems } from "@/lib/analytics.functions";
import { AdminGuard } from "@/components/AdminGuard";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalyticsPage,
});

function AdminAnalyticsPage() {
  const fetchStats = useServerFn(getDashboardStats);
  const fetchMonthly = useServerFn(getMonthlyAnalytics);
  const fetchTopItems = useServerFn(getTopSellingItems);

  type FilterType = 'today' | 'weekly' | 'monthly' | 'yearly';
  const [filter, setFilter] = useState<FilterType>('monthly');

  const [stats, setStats] = useState<any>(null);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topItems, setTopItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [s, m, t] = await Promise.all([
          fetchStats({ data: { filter } }),
          fetchMonthly({ data: { filter } }),
          fetchTopItems({ data: { filter } }),
        ]);
        setStats(s);
        setMonthlyData(m);
        setTopItems(t);
      } catch (e: any) {
        toast.error("Failed to load analytics: " + e.message);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [filter]);

  const filterLabel = filter === 'today' ? "Today" : filter === 'weekly' ? "Last 7 Days" : filter === 'yearly' ? "Last 365 Days" : "Last 30 Days";

  if (isLoading) {
    return (
      <AdminGuard>
        <div className="p-8 font-mono text-ink/50 animate-pulse">
          Gathering analytics...
        </div>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <div className="p-8 max-w-7xl mx-auto space-y-12">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl mb-2">Analytics & Sales.</h1>
            <p className="font-mono text-sm uppercase tracking-widest opacity-60">
              Overview
            </p>
          </div>
          <div className="flex bg-white/60 border border-ink/10 p-1 font-mono text-xs uppercase overflow-x-auto">
            {(['today', 'weekly', 'monthly', 'yearly'] as FilterType[]).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 transition-colors whitespace-nowrap ${filter === f ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white/60 border border-ink/10 p-6">
            <p className="font-mono text-xs uppercase tracking-widest opacity-60 mb-4">
              Total Revenue ({filterLabel})
            </p>
            <p className="font-display text-4xl text-accent">
              ₹{stats?.period?.revenue?.toLocaleString() ?? 0}
            </p>
            <p className="font-mono text-xs opacity-50 mt-2">
              All time: ₹{stats?.allTime?.revenue?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="bg-white/60 border border-ink/10 p-6">
            <p className="font-mono text-xs uppercase tracking-widest opacity-60 mb-4">
              Est. Profit ({filterLabel} @ 30%)
            </p>
            <p className="font-display text-4xl text-green-700">
              ₹{stats?.period?.profit?.toLocaleString() ?? 0}
            </p>
            <p className="font-mono text-xs opacity-50 mt-2">
              All time: ₹{stats?.allTime?.profit?.toLocaleString() ?? 0}
            </p>
          </div>
          <div className="bg-white/60 border border-ink/10 p-6">
            <p className="font-mono text-xs uppercase tracking-widest opacity-60 mb-4">
              Orders ({filterLabel})
            </p>
            <p className="font-display text-4xl">
              {stats?.period?.orders?.toLocaleString() ?? 0}
            </p>
            <p className="font-mono text-xs opacity-50 mt-2">
              All time: {stats?.allTime?.orders?.toLocaleString() ?? 0}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Chart Section */}
          <div className="lg:col-span-2 bg-white/60 border border-ink/10 p-6">
            <h2 className="font-mono text-sm uppercase tracking-widest opacity-60 mb-6">
              Daily Revenue ({filterLabel})
            </h2>
            <div className="h-80 w-full">
              {monthlyData.length === 0 ? (
                <div className="h-full flex items-center justify-center font-mono text-xs opacity-50 italic">
                  No data available for {filterLabel.toLowerCase()}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor="#e63946" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#e63946" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.1)" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(val) => val.slice(5)} // Show MM-DD
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontFamily: "monospace", fontSize: 10, fill: "rgba(0,0,0,0.5)" }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontFamily: "monospace", fontSize: 10, fill: "rgba(0,0,0,0.5)" }}
                      dx={-10}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#f4f1eb",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        border: "1px solid rgba(0,0,0,0.1)",
                        borderRadius: "0px",
                      }}
                      itemStyle={{ color: "#e63946", fontWeight: "bold" }}
                      formatter={(value: number) => [`₹${value}`, "Revenue"]}
                      labelStyle={{ color: "rgba(0,0,0,0.5)", marginBottom: "4px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#e63946"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="bg-white/60 border border-ink/10 p-6 flex flex-col">
            <h2 className="font-mono text-sm uppercase tracking-widest opacity-60 mb-6">
              Top Selling Items
            </h2>
            <div className="flex-1 overflow-auto max-h-[320px] pr-2">
              {topItems.length === 0 ? (
                <div className="font-mono text-xs opacity-50 italic">
                  No items sold recently.
                </div>
              ) : (
                <div className="space-y-4">
                  {topItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-ink/5 pb-3 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs opacity-30 w-4">
                          {idx + 1}.
                        </span>
                        <div>
                          <p className="font-display text-lg leading-none">
                            {item.name}
                          </p>
                          <p className="font-mono text-[10px] opacity-50 mt-1">
                            {item.quantity} units sold
                          </p>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-accent text-sm">
                        ₹{item.revenue}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminGuard>
  );
}
