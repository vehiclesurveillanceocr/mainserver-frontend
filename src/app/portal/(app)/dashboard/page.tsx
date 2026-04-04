"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Monitor, Tablet, Link2, FileText, AlertCircle, Activity, Clock, CheckCircle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type DeviceStatus = "PENDING" | "ACTIVE" | "OFFLINE" | "DISABLED";
type HitlistStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface Workstation {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
}

interface TabletDevice {
  id: string;
  name: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
}

interface DevicePairing {
  id: string;
  workstationId: string;
  tabletId: string;
  createdAt: string;
  unpairedAt: string | null;
}

interface DevicesData {
  workstations: Workstation[];
  tablets: TabletDevice[];
  pairings: DevicePairing[];
}

interface HitlistVersion {
  versionNumber: number;
  entries?: HitlistEntry[];
  createdAt?: string;
}

interface HitlistEntry {
  id: string;
  plateOriginal: string;
  plateNormalized: string;
}

interface HitlistItem {
  id: string;
  name: string;
  status: HitlistStatus;
  currentVersionNumber: number;
  versions: HitlistVersion[];
  createdAt: string;
}

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    ACTIVE: "oklch(0.72 0.19 145)",
    PENDING: "oklch(0.75 0.15 80)",
    OFFLINE: "oklch(0.60 0.20 25)",
    DISABLED: "oklch(0.40 0.005 260)",
  };
  return map[status] ?? "oklch(0.40 0.005 260)";
}

function SkeletonCard() {
  return (
    <Card className="glass animate-pulse">
      <CardContent className="p-6">
        <div className="h-5 w-5 rounded bg-muted" />
        <div className="mt-4 space-y-2">
          <div className="h-8 w-16 rounded bg-muted" />
          <div className="h-4 w-24 rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <Card className="glass glass-hover transition-all">
      <CardContent className="p-6">
        <div className="text-muted-foreground">{icon}</div>
        <div className="mt-4">
          <div className="text-3xl font-bold text-foreground tabular-nums">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
          {sub && <div className="mt-2">{sub}</div>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { dictionary, isRTL, formatDateTime, formatRelativeTime } = useLanguage();
  const copy = dictionary.dashboard;
  const common = dictionary.common;

  const [devices, setDevices] = useState<DevicesData | null>(null);
  const [hitlists, setHitlists] = useState<HitlistItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const [devResp, hlResp] = await Promise.all([
          api.get<ApiResp<DevicesData>>("/api/devices"),
          api.get<ApiResp<HitlistItem[]>>("/api/hitlists"),
        ]);
        if (cancelled) return;
        if (devResp.success) setDevices(devResp.data);
        else setError(devResp.error);
        if (hlResp.success) setHitlists(hlResp.data);
        else if (!devResp.success) setError(hlResp.error);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : copy.loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchAll();
    return () => {
      cancelled = true;
    };
  }, [copy.loadError]);

  const wsList = devices?.workstations ?? [];
  const activeWs = wsList.filter((w) => w.status === "ACTIVE").length;
  const offlineWs = wsList.filter((w) => w.status === "OFFLINE").length;
  const pendingWs = wsList.filter((w) => w.status === "PENDING").length;
  const activePairings = (devices?.pairings ?? []).filter((p) => !p.unpairedAt).length;
  const activeHitlists = (hitlists ?? []).filter((h) => h.status === "ACTIVE").length;

  const allDevices: Array<{ status: string }> = [
    ...(devices?.workstations ?? []),
    ...(devices?.tablets ?? []),
  ];

  const statusCounts = Object.entries(
    allDevices.reduce<Record<string, number>>((acc, d) => {
      acc[d.status] = (acc[d.status] ?? 0) + 1;
      return acc;
    }, {}),
  ).map(([name, value]) => ({ name, value, fill: getStatusColor(name) }));

  const recentActivity = [...(hitlists ?? [])]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const statusLabel = (status: DeviceStatus) => {
    if (status === "ACTIVE") return common.active;
    if (status === "OFFLINE") return common.offline;
    if (status === "PENDING") return common.pending;
    return common.disabled;
  };

  return (
    <div className="space-y-6 p-6" dir={isRTL ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">{copy.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{copy.subtitle}</p>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {loading ? (
          ["ws", "tb", "pr", "hl"].map((k) => <SkeletonCard key={k} />)
        ) : (
          <>
            <StatCard
              icon={<Monitor className="h-5 w-5" />}
              label={copy.totalWorkstations}
              value={wsList.length}
              sub={
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="success">{activeWs} {common.active.toLowerCase()}</Badge>
                  <Badge variant="secondary">{offlineWs} {common.offline.toLowerCase()}</Badge>
                  <Badge variant="warning">{pendingWs} {common.pending.toLowerCase()}</Badge>
                </div>
              }
            />
            <StatCard
              icon={<Tablet className="h-5 w-5" />}
              label={copy.totalTablets}
              value={devices?.tablets.length ?? 0}
            />
            <StatCard
              icon={<Link2 className="h-5 w-5" />}
              label={copy.activePairings}
              value={activePairings}
              sub={
                <span className="text-xs text-muted-foreground">
                  {(devices?.pairings.length ?? 0) - activePairings} {copy.unpaired}
                </span>
              }
            />
            <StatCard
              icon={<FileText className="h-5 w-5" />}
              label={copy.activeHitlists}
              value={activeHitlists}
              sub={
                <span className="text-xs text-muted-foreground">
                  {hitlists?.length ?? 0} {copy.total}
                </span>
              }
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="glass xl:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{copy.deviceStatusDistribution}</h2>
            </div>
            {loading ? (
              <div className="h-48 animate-pulse rounded-lg bg-muted" />
            ) : statusCounts.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                {copy.noDevicesRegistered}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={statusCounts} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "oklch(0.60 0.005 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "oklch(0.60 0.005 260)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "oklch(0.12 0.005 260 / 0.95)",
                      border: "1px solid oklch(1 0 0 / 0.1)",
                      borderRadius: "8px",
                      color: "oklch(0.96 0.005 80)",
                      fontSize: "12px",
                    }}
                    cursor={{ fill: "oklch(1 0 0 / 0.04)" }}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {statusCounts.map((entry) => (
                      <Cell key={entry.name} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-5">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{common.systemStatus}</h2>
            </div>
            {loading ? (
              <div className="space-y-3">
                {["s1", "s2", "s3", "s4"].map((k) => (
                  <div key={k} className="flex items-center justify-between animate-pulse">
                    <div className="h-4 w-20 rounded bg-muted" />
                    <div className="h-4 w-6 rounded bg-muted" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {statusCounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{copy.noDevicesFound}</p>
                ) : (
                  statusCounts.map(({ name, value, fill }) => (
                    <div key={name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ background: fill }} />
                        <span className="text-sm text-muted-foreground">{statusLabel(name as DeviceStatus)}</span>
                      </div>
                      <span className="text-sm font-semibold text-foreground tabular-nums">{value}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{copy.workstationHealth}</h2>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {["ws-health-1", "ws-health-2", "ws-health-3"].map((key) => (
                <Card key={key} className="glass animate-pulse border-border/60">
                  <CardContent className="p-5 space-y-3">
                    <div className="h-4 w-28 rounded bg-muted" />
                    <div className="h-4 w-20 rounded bg-muted" />
                    <div className="h-10 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : wsList.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noWorkstations}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {wsList.map((workstation) => (
                <Card key={workstation.id} className="glass glass-hover transition-all border-border/60">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{workstation.name}</p>
                        <p className="text-xs text-muted-foreground mt-1">{copy.operationalStatusOverview}</p>
                      </div>
                      <Badge variant={workstation.status === "ACTIVE" ? "success" : workstation.status === "OFFLINE" ? "destructive" : workstation.status === "PENDING" ? "warning" : "secondary"} className="inline-flex items-center gap-1.5 shrink-0">
                        <span className={cn("h-2 w-2 rounded-full", workstation.status === "ACTIVE" ? "bg-success" : workstation.status === "OFFLINE" ? "bg-destructive" : workstation.status === "PENDING" ? "bg-warning" : "bg-muted-foreground")} />
                        {statusLabel(workstation.status)}
                      </Badge>
                    </div>

                    <div className="rounded-lg border border-border bg-card/30 px-3 py-3 space-y-2">
                      <div className="flex items-center justify-between text-sm gap-4">
                        <span className="text-muted-foreground">{common.status}</span>
                        <span className="text-foreground font-medium">{statusLabel(workstation.status)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm gap-4">
                        <span className="text-muted-foreground">{common.lastSeen}</span>
                        <span className="text-foreground font-medium force-ltr">{formatRelativeTime(workstation.lastSeenAt)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{copy.recentActivity}</h2>
          </div>
          {loading ? (
            <div className="space-y-3">
              {["activity-1", "activity-2", "activity-3", "activity-4", "activity-5"].map((key) => (
                <div key={key} className="flex items-center justify-between animate-pulse py-2">
                  <div className="h-4 w-48 rounded bg-muted" />
                  <div className="h-4 w-24 rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">{copy.noHitlists}</p>
          ) : (
            <div className="divide-y divide-border">
              {recentActivity.map((h) => {
                const latestEntries = h.versions[0]?.entries?.length ?? 0;
                return (
                  <div key={h.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <CheckCircle
                        className={cn(
                          "h-4 w-4 shrink-0",
                          h.status === "ACTIVE" ? "text-success" : "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{h.name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{h.currentVersionNumber} · {latestEntries} {copy.entries} ·{" "}
                          <Badge
                            variant={
                              h.status === "ACTIVE" ? "success" :
                              h.status === "DRAFT" ? "warning" :
                              "secondary"
                            }
                            className="capitalize"
                          >
                            {h.status === "ACTIVE" ? common.active.toLowerCase() : h.status === "DRAFT" ? common.draft.toLowerCase() : common.archived.toLowerCase()}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 ml-4 force-ltr">
                      {formatDateTime(h.createdAt, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
