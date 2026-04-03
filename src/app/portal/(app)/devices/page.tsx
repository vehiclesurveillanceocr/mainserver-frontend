"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu, HardDrive, MemoryStick, MonitorSmartphone, RefreshCw, Router, Wifi, WifiOff, AlertCircle, Camera, MapPinned, Satellite } from "lucide-react";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type DeviceStatus = "PENDING" | "ACTIVE" | "OFFLINE" | "DISABLED";
type CameraStatus = "ONLINE" | "OFFLINE" | "DEGRADED" | "MAINTENANCE";
type TabletSignal = "STRONG" | "FAIR" | "WEAK" | "DISCONNECTED";
type GeoStatus = "LOCKED" | "SEARCHING" | "OFFLINE";

interface Workstation {
  id: string;
  deviceId: string;
  name: string;
  description: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

interface Tablet {
  id: string;
  deviceId: string;
  name: string;
  description?: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

interface WorkstationMetrics {
  workstationId: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageUsagePercent: number;
  uptimeHours: number;
  networkUplinkMbps: number;
  temperatureC: number;
  gpsStatus: GeoStatus;
  gnssStatus: GeoStatus;
  lastFixAt: string | null;
}

interface TabletStatus {
  workstationId: string;
  tabletId: string | null;
  connectedToWorkstation: boolean;
  batteryLevel: number | null;
  memoryUsagePercent: number | null;
  signalStrength: TabletSignal;
  appVersion: string | null;
  lastHeartbeatAt: string | null;
}

interface CameraInfo {
  id: string;
  workstationId: string;
  name: string;
  position: string;
  status: CameraStatus;
  fps: number;
  resolution: string;
  lastFrameAt: string | null;
  healthNote: string;
}

interface WorkstationDetail {
  workstation: Workstation;
  tablet: Tablet | null;
  metrics: WorkstationMetrics;
  tabletStatus: TabletStatus;
  cameras: CameraInfo[];
}

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function workstationBadge(status: DeviceStatus) {
  const map: Record<DeviceStatus, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
    ACTIVE: { label: "Online", variant: "success" },
    OFFLINE: { label: "Offline", variant: "destructive" },
    PENDING: { label: "Pending", variant: "warning" },
    DISABLED: { label: "Disabled", variant: "secondary" },
  };

  return map[status] ?? map.OFFLINE;
}

function cameraSummary(cameras: CameraInfo[]) {
  return {
    online: cameras.filter((camera) => camera.status === "ONLINE").length,
    degraded: cameras.filter((camera) => camera.status === "DEGRADED").length,
    offline: cameras.filter((camera) => camera.status === "OFFLINE").length,
    maintenance: cameras.filter((camera) => camera.status === "MAINTENANCE").length,
  };
}

function geoSummary(item: WorkstationDetail) {
  return `${item.metrics.gpsStatus} GPS • ${item.metrics.gnssStatus} GNSS`;
}

export default function DevicesPage() {
  const [workstations, setWorkstations] = useState<WorkstationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkstations = useCallback(async (silent = false) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);
    try {
      const resp = await api.get<ApiResp<WorkstationDetail[]>>("/api/workstations");
      if (resp.success) {
        setWorkstations(resp.data);
      } else {
        setError(resp.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load workstation grid");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchWorkstations();
  }, [fetchWorkstations]);

  const summary = useMemo(() => {
    const totalCameras = workstations.reduce((sum, item) => sum + item.cameras.length, 0);
    const linkedTablets = workstations.filter((item) => item.tabletStatus.connectedToWorkstation).length;
    const onlineWorkstations = workstations.filter((item) => item.workstation.status === "ACTIVE").length;
    const onlineCameras = workstations.flatMap((item) => item.cameras).filter((camera) => camera.status === "ONLINE").length;

    return {
      workstations: workstations.length,
      onlineWorkstations,
      linkedTablets,
      totalCameras,
      onlineCameras,
    };
  }, [workstations]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Workstations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitor each workstation, its six cameras, tablet link, and runtime health.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => void fetchWorkstations(true)}
          disabled={refreshing}
          className="glass glass-hover flex items-center gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard icon={Router} label="Workstations" value={summary.workstations} />
        <SummaryCard icon={Wifi} label="Online" value={summary.onlineWorkstations} tone="success" />
        <SummaryCard icon={MonitorSmartphone} label="Tablet Linked" value={summary.linkedTablets} />
        <SummaryCard icon={Camera} label="Total Cameras" value={summary.totalCameras} />
        <SummaryCard icon={HardDrive} label="Live Cameras" value={summary.onlineCameras} tone="success" />
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index} className="glass animate-pulse">
              <CardContent className="p-6 space-y-4">
                <div className="h-6 w-36 rounded bg-muted" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="h-16 rounded bg-muted" />
                  <div className="h-16 rounded bg-muted" />
                </div>
                <div className="h-24 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {workstations.map((item) => (
            <WorkstationCard key={item.workstation.id} item={item} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Router;
  label: string;
  value: number;
  tone?: "default" | "success";
}) {
  return (
    <Card className="glass rounded-xl">
      <CardContent className="p-5 flex items-center gap-4">
        <div className={cn("p-2.5 rounded-lg bg-card", tone === "success" && "text-success")}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className={cn("text-2xl font-semibold tabular-nums text-foreground", tone === "success" && "text-success")}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function WorkstationCard({ item }: { item: WorkstationDetail }) {
  const workstationMeta = workstationBadge(item.workstation.status);
  const summary = cameraSummary(item.cameras);

  return (
    <Card className="glass glass-hover rounded-2xl border-border/70 transition-all">
      <CardContent className="p-6 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-foreground truncate">{item.workstation.name}</h2>
            <p className="text-xs text-muted-foreground mt-1">{item.workstation.deviceId}</p>
            {item.workstation.description && (
              <p className="text-sm text-muted-foreground mt-2">{item.workstation.description}</p>
            )}
          </div>
          <Badge variant={workstationMeta.variant}>{workstationMeta.label}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricMini icon={Cpu} label="CPU" value={`${item.metrics.cpuUsagePercent}%`} />
          <MetricMini icon={MemoryStick} label="Memory" value={`${item.metrics.memoryUsagePercent}%`} />
          <MetricMini icon={HardDrive} label="Storage" value={`${item.metrics.storageUsagePercent}%`} />
          <MetricMini icon={Wifi} label="Uplink" value={`${item.metrics.networkUplinkMbps} Mbps`} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-card/30 p-4">
            <p className="text-xs text-muted-foreground">Tablet</p>
            <div className="mt-2 flex items-center gap-2">
              {item.tabletStatus.connectedToWorkstation ? (
                <Wifi className="h-4 w-4 text-success" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive" />
              )}
              <p className="text-sm font-medium text-foreground">
                {item.tablet ? item.tablet.name : "No tablet linked"}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {item.tabletStatus.connectedToWorkstation
                ? `Battery ${item.tabletStatus.batteryLevel}% • Signal ${item.tabletStatus.signalStrength}`
                : "Tablet disconnected from workstation"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card/30 p-4">
            <p className="text-xs text-muted-foreground">Camera Fleet</p>
            <p className="mt-2 text-sm font-medium text-foreground">{item.cameras.length} cameras configured</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary.online} online • {summary.degraded} degraded • {summary.offline} offline • {summary.maintenance} maintenance
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MetricMini icon={MapPinned} label="GPS" value={item.metrics.gpsStatus} />
          <MetricMini icon={Satellite} label="GNSS" value={item.metrics.gnssStatus} />
        </div>

        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-xs text-muted-foreground">
            Last seen {timeAgo(item.workstation.lastSeenAt)} • Uptime {item.metrics.uptimeHours}h • Temp {item.metrics.temperatureC}°C • {geoSummary(item)}
          </div>
          <Button asChild className="gap-2">
            <Link href={`/portal/devices/${item.workstation.id}`}>Open Workstation</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricMini({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-foreground">{value}</p>
    </div>
  );
}
