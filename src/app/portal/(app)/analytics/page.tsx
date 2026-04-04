"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { BarChart3, Cpu, Wifi, WifiOff, ListChecks, Loader2, Activity } from "lucide-react";
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Legend,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { useTheme } from "@/components/theme-provider";
import type { SystemHealthPoint } from "@/types/domain";

interface Device { id: string; status: string }
interface Hitlist { id: string; name: string; status: string; versions: { entries: unknown[] }[] }
interface DevicesResponse { workstations: Device[]; tablets: Device[]; pairings: unknown[] }
type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function GlassTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-heavy rounded-lg px-3 py-2 text-xs">
      {label && <p className="text-muted-foreground mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const { dictionary, isRTL } = useLanguage();
  const copy = dictionary.analytics;
  const common = dictionary.common;
  const [devices, setDevices] = useState<DevicesResponse | null>(null);
  const [hitlists, setHitlists] = useState<Hitlist[] | null>(null);
  const [healthTimeline, setHealthTimeline] = useState<SystemHealthPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useTheme();

  const chartPalette = theme === "dark"
    ? {
        grid: "rgba(255,255,255,0.12)",
        axis: "#9ca3af",
        active: "#4ade80",
        offline: "#f87171",
        pending: "#fbbf24",
        disabled: "#71717a",
        bar: "#60a5fa",
        cpu: "#34d399",
        memory: "#60a5fa",
        network: "#f59e0b",
        alerts: "#f87171",
      }
    : {
        grid: "rgba(15,23,42,0.12)",
        axis: "#64748b",
        active: "#16a34a",
        offline: "#dc2626",
        pending: "#d97706",
        disabled: "#6b7280",
        bar: "#2563eb",
        cpu: "#059669",
        memory: "#2563eb",
        network: "#d97706",
        alerts: "#dc2626",
      };

  useEffect(() => {
    Promise.all([
      api.get<ApiResp<DevicesResponse>>("/api/devices"),
      api.get<ApiResp<Hitlist[]>>("/api/hitlists"),
      api.get<ApiResp<SystemHealthPoint[]>>("/api/analytics/system-health"),
    ])
      .then(([d, h, timeline]) => {
        if (d.success) setDevices(d.data);
        else setError(d.error);
        if (h.success) setHitlists(h.data);
        else if (!d.success) setError(h.error);
        if (timeline.success) setHealthTimeline(timeline.data);
        else if (!d.success && !h.success) setError(timeline.error);
      })
      .catch((e) => setError(e instanceof Error ? e.message : copy.loadError))
      .finally(() => setLoading(false));
  }, [copy.loadError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass rounded-xl p-6 border border-destructive/20 bg-destructive/5">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  const allDevices = [...(devices?.workstations ?? []), ...(devices?.tablets ?? [])];
  const statusCounts = allDevices.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  const statusName = (name: string) =>
    name === "ACTIVE" ? common.active :
    name === "OFFLINE" ? common.offline :
    name === "PENDING" ? common.pending :
    common.disabled;

  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
  const statusColors: Record<string, string> = {
    ACTIVE: chartPalette.active,
    OFFLINE: chartPalette.offline,
    PENDING: chartPalette.pending,
    DISABLED: chartPalette.disabled,
  };

  const barData = (hitlists ?? [])
    .filter((h) => h.status === "ACTIVE")
    .map((h) => ({
      name: h.name.length > 15 ? `${h.name.slice(0, 15)}...` : h.name,
      entries: h.versions?.[0]?.entries?.length ?? 0,
    }));

  const totalEntries = barData.reduce((sum, b) => sum + b.entries, 0);
  const activeDevices = statusCounts.ACTIVE ?? 0;
  const offlineDevices = statusCounts.OFFLINE ?? 0;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: copy.totalDevices, value: allDevices.length, icon: Cpu, color: "text-foreground" },
          { label: copy.active, value: activeDevices, icon: Wifi, color: "text-success" },
          { label: copy.offline, value: offlineDevices, icon: WifiOff, color: "text-destructive" },
          { label: copy.hitlistEntries, value: totalEntries, icon: ListChecks, color: "text-info" },
        ].map((stat) => (
          <Card key={stat.label} className="glass">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className={cn("p-2 rounded-lg bg-card", stat.color)}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className={cn("text-2xl font-semibold", stat.color)}>{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              {copy.deviceStatusDistribution}
            </h3>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={statusColors[entry.name] ?? chartPalette.disabled} />
                    ))}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">{copy.noDevicesRegistered}</div>
            )}
            <div className="flex justify-center gap-4 mt-2 flex-wrap">
              {pieData.map((d) => (
                <div key={d.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: statusColors[d.name] ?? chartPalette.disabled }} />
                  <span className="text-muted-foreground">{statusName(d.name)} ({d.value})</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-muted-foreground" />
              {copy.hitlistEntriesByWatchlist}
            </h3>
            {barData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
                  <XAxis dataKey="name" tick={{ fill: chartPalette.axis, fontSize: 11 }} axisLine={{ stroke: chartPalette.grid }} />
                  <YAxis tick={{ fill: chartPalette.axis, fontSize: 11 }} axisLine={{ stroke: chartPalette.grid }} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="entries" fill={chartPalette.bar} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground text-sm">{copy.noActiveHitlists}</div>
            )}
          </CardContent>
        </Card>

        <Card className="glass lg:col-span-2">
          <CardContent className="p-6">
            <h3 className="text-sm font-medium text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              {copy.systemHealthTimeline}
            </h3>
            {healthTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={healthTimeline} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chartPalette.grid} />
                  <XAxis dataKey="label" tick={{ fill: chartPalette.axis, fontSize: 11 }} axisLine={{ stroke: chartPalette.grid }} />
                  <YAxis yAxisId="percent" tick={{ fill: chartPalette.axis, fontSize: 11 }} axisLine={{ stroke: chartPalette.grid }} domain={[0, 100]} />
                  <YAxis yAxisId="network" orientation="right" tick={{ fill: chartPalette.axis, fontSize: 11 }} axisLine={{ stroke: chartPalette.grid }} />
                  <Tooltip content={<GlassTooltip />} />
                  <Legend wrapperStyle={{ fontSize: "12px", color: chartPalette.axis }} />
                  <Line yAxisId="percent" type="monotone" dataKey="cpuUsagePercent" name={copy.cpuPercent} stroke={chartPalette.cpu} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="percent" type="monotone" dataKey="memoryUsagePercent" name={copy.memoryPercent} stroke={chartPalette.memory} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="network" type="monotone" dataKey="networkUplinkMbps" name={copy.uplinkMbps} stroke={chartPalette.network} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line yAxisId="network" type="monotone" dataKey="alertCount" name={copy.alerts} stroke={chartPalette.alerts} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 2.5 }} activeDot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                <div className="text-center">
                  <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p>{copy.timelineUnavailable}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
