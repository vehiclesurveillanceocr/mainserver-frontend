"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Camera,
  Wifi,
  WifiOff,
  Clock,
  MonitorSmartphone,
  Loader2,
  AlertCircle,
  RefreshCw,
  Circle,
} from "lucide-react";

interface Workstation {
  id: string;
  deviceId: string;
  name: string;
  description: string | null;
  status: "PENDING" | "ACTIVE" | "OFFLINE" | "DISABLED";
  lastSeenAt: string | null;
  createdAt: string;
}

interface Tablet {
  id: string;
  deviceId: string;
  name: string;
  status: "PENDING" | "ACTIVE" | "OFFLINE" | "DISABLED";
  lastSeenAt: string | null;
}

interface DevicePairing {
  id: string;
  workstationId: string;
  tabletId: string;
  unpairedAt: string | null;
}

interface DevicesData {
  workstations: Workstation[];
  tablets: Tablet[];
  pairings: DevicePairing[];
}

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

export default function CamerasPage() {
  const { dictionary, isRTL, formatRelativeTime } = useLanguage();
  const common = dictionary.common;
  const [data, setData] = useState<DevicesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDevices = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const resp = await api.get<ApiResp<DevicesData>>("/api/devices");
      if (resp.success) setData(resp.data);
      else setError(resp.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchDevices();
    const id = setInterval(() => void fetchDevices(true), 30000);
    return () => clearInterval(id);
  }, [fetchDevices]);

  const workstations = data?.workstations ?? [];
  const pairings = data?.pairings ?? [];
  const tablets = data?.tablets ?? [];

  const activeCount = workstations.filter((w) => w.status === "ACTIVE").length;
  const offlineCount = workstations.filter((w) => w.status === "OFFLINE").length;

  function getLinkedTablet(ws: Workstation): Tablet | undefined {
    const pairing = pairings.find((p) => p.workstationId === ws.id && !p.unpairedAt);
    if (!pairing) return undefined;
    return tablets.find((t) => t.id === pairing.tabletId);
  }

  function statusConfig(status: string) {
    const map: Record<string, { label: string; color: string; icon: typeof Wifi }> = {
      ACTIVE: { label: common.online, color: "text-success", icon: Wifi },
      OFFLINE: { label: common.offline, color: "text-destructive", icon: WifiOff },
      PENDING: { label: common.pending, color: "text-warning", icon: Clock },
      DISABLED: { label: common.disabled, color: "text-muted-foreground", icon: WifiOff },
    };
    return map[status] ?? map.OFFLINE;
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Cameras</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live workstation feed status and camera health monitoring
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchDevices(true)}
          disabled={refreshing}
          className={cn(
            "flex items-center gap-2 glass glass-hover text-muted-foreground hover:text-foreground",
            refreshing && "opacity-50",
          )}
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {common.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Camera} label="Total Workstations" value={workstations.length} />
        <StatCard icon={Wifi} label={common.online} value={activeCount} valueClass="text-success" iconClass="text-success" />
        <StatCard icon={WifiOff} label={common.offline} value={offlineCount} valueClass="text-destructive" iconClass="text-destructive" />
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : workstations.length === 0 ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="glass rounded-full p-6 mb-4">
            <Camera className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">No Workstations</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Register a workstation to begin monitoring camera feeds.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {workstations.map((ws) => {
            const cfg = statusConfig(ws.status);
            const StatusIcon = cfg.icon;
            const linkedTablet = getLinkedTablet(ws);

            return (
              <div key={ws.id} className="glass rounded-xl overflow-hidden glass-hover transition-all">
                <div className="aspect-video bg-card/30 flex items-center justify-center relative">
                  <Camera className="h-12 w-12 text-muted-foreground/20" />
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
                    <Circle className={cn("h-2 w-2 fill-current", cfg.color)} />
                    <span className={cn("text-xs font-medium", cfg.color)}>{cfg.label}</span>
                  </div>
                  {ws.status === "ACTIVE" && (
                    <div className="absolute bottom-3 left-3 flex items-center gap-1.5 glass rounded-full px-2.5 py-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
                      <span className="text-xs text-success">Live</span>
                    </div>
                  )}
                </div>

                <div className="px-4 py-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-foreground truncate">{ws.name}</h3>
                    <StatusIcon className={cn("h-4 w-4 shrink-0", cfg.color)} />
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-mono force-ltr">{ws.deviceId}</span>
                  </div>

                  <div className="flex items-center justify-between text-xs gap-3">
                    <span className="text-muted-foreground">{common.lastSeen}: <span className="force-ltr">{formatRelativeTime(ws.lastSeenAt)}</span></span>
                    {linkedTablet && (
                      <span className="flex items-center gap-1 text-accent">
                        <MonitorSmartphone className="h-3 w-3" />
                        {linkedTablet.name}
                      </span>
                    )}
                  </div>

                  {ws.description && (
                    <p className="text-xs text-muted-foreground/70 truncate">{ws.description}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  valueClass,
  iconClass,
}: {
  icon: typeof Camera;
  label: string;
  value: number;
  valueClass?: string;
  iconClass?: string;
}) {
  return (
    <Card className="glass rounded-xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className="p-2.5 rounded-lg bg-card">
          <Icon className={cn("h-5 w-5 text-muted-foreground", iconClass)} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-semibold text-foreground tabular-nums", valueClass)}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
