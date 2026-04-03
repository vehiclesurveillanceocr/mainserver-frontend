"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Camera,
  Cpu,
  HardDrive,
  MapPinned,
  MemoryStick,
  MonitorSmartphone,
  RefreshCw,
  Satellite,
  Thermometer,
  Wifi,
  WifiOff,
} from "lucide-react";
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

function statusBadge(status: DeviceStatus) {
  const map: Record<DeviceStatus, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
    ACTIVE: { label: "Online", variant: "success" },
    OFFLINE: { label: "Offline", variant: "destructive" },
    PENDING: { label: "Pending", variant: "warning" },
    DISABLED: { label: "Disabled", variant: "secondary" },
  };
  return map[status] ?? map.OFFLINE;
}

function cameraBadge(status: CameraStatus) {
  const map: Record<CameraStatus, { label: string; variant: "success" | "destructive" | "warning" | "secondary" }> = {
    ONLINE: { label: "Online", variant: "success" },
    OFFLINE: { label: "Offline", variant: "destructive" },
    DEGRADED: { label: "Degraded", variant: "warning" },
    MAINTENANCE: { label: "Maintenance", variant: "secondary" },
  };
  return map[status];
}

function geoTone(status: GeoStatus): "success" | "destructive" | "default" {
  if (status === "LOCKED") return "success";
  if (status === "OFFLINE") return "destructive";
  return "default";
}

export default function WorkstationDetailPage({
  params,
}: {
  params: Promise<{ workstationId: string }>;
}) {
  const { workstationId } = use(params);
  const [detail, setDetail] = useState<WorkstationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load(silent = false) {
      if (silent) setRefreshing(true);
      else setLoading(true);

      setError(null);
      try {
        const resp = await api.get<ApiResp<WorkstationDetail>>(`/api/workstations/${workstationId}`);
        if (resp.success) {
          setDetail(resp.data);
        } else {
          setError(resp.error);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load workstation details");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }

    void load();
  }, [workstationId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-52 rounded bg-muted animate-pulse" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="h-40 rounded-2xl bg-muted animate-pulse" />
          <div className="h-40 rounded-2xl bg-muted animate-pulse lg:col-span-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-48 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-6">
        <Button asChild variant="outline" className="glass glass-hover w-fit">
          <Link href="/portal/devices"><ArrowLeft className="h-4 w-4" /> Back to Workstations</Link>
        </Button>
        <div className="glass rounded-xl p-6 border border-destructive/30 bg-destructive/5">
          <p className="text-sm text-destructive">{error ?? "Workstation not found."}</p>
        </div>
      </div>
    );
  }

  const workstationMeta = statusBadge(detail.workstation.status);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <Button asChild variant="outline" className="glass glass-hover w-fit">
            <Link href="/portal/devices"><ArrowLeft className="h-4 w-4" /> Back to Workstations</Link>
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-semibold text-foreground">{detail.workstation.name}</h1>
            <Badge variant={workstationMeta.variant}>{workstationMeta.label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {detail.workstation.deviceId} • Last seen {timeAgo(detail.workstation.lastSeenAt)} • Uptime {detail.metrics.uptimeHours}h
          </p>
        </div>

        <Button type="button" variant="outline" className="glass glass-hover gap-2" disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-warning/30 bg-warning/5 flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
          <p className="text-sm text-warning">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="glass rounded-2xl">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Tablet Link</h2>
            </div>
            <div>
              <p className="text-base font-medium text-foreground">
                {detail.tablet ? detail.tablet.name : "No tablet linked"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {detail.tablet
                  ? `${detail.tablet.deviceId} • Last heartbeat ${timeAgo(detail.tabletStatus.lastHeartbeatAt)}`
                  : "Assign a tablet to enable field response monitoring"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <InfoTile
                icon={detail.tabletStatus.connectedToWorkstation ? Wifi : WifiOff}
                label="Connected"
                value={detail.tabletStatus.connectedToWorkstation ? "Yes" : "No"}
                tone={detail.tabletStatus.connectedToWorkstation ? "success" : "destructive"}
              />
              <InfoTile icon={MonitorSmartphone} label="Signal" value={detail.tabletStatus.signalStrength} />
              <InfoTile
                icon={HardDrive}
                label="Battery"
                value={detail.tabletStatus.batteryLevel !== null ? `${detail.tabletStatus.batteryLevel}%` : "N/A"}
              />
              <InfoTile
                icon={MemoryStick}
                label="Tablet Memory"
                value={detail.tabletStatus.memoryUsagePercent !== null ? `${detail.tabletStatus.memoryUsagePercent}%` : "N/A"}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass rounded-2xl xl:col-span-2">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Cpu className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Workstation Runtime</h2>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <InfoTile icon={Cpu} label="CPU Usage" value={`${detail.metrics.cpuUsagePercent}%`} />
              <InfoTile icon={MemoryStick} label="Memory Usage" value={`${detail.metrics.memoryUsagePercent}%`} />
              <InfoTile icon={HardDrive} label="Storage Usage" value={`${detail.metrics.storageUsagePercent}%`} />
              <InfoTile icon={Wifi} label="Uplink" value={`${detail.metrics.networkUplinkMbps} Mbps`} />
              <InfoTile icon={Thermometer} label="Temperature" value={`${detail.metrics.temperatureC}°C`} />
              <InfoTile icon={MapPinned} label="GPS" value={detail.metrics.gpsStatus} tone={geoTone(detail.metrics.gpsStatus)} />
              <InfoTile icon={Satellite} label="GNSS" value={detail.metrics.gnssStatus} tone={geoTone(detail.metrics.gnssStatus)} />
              <InfoTile icon={Camera} label="Cameras" value={`${detail.cameras.length}`} />
            </div>
            <div className="rounded-xl border border-border bg-card/30 p-4">
              <p className="text-xs text-muted-foreground">Navigation Fix</p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                Last GPS fix {timeAgo(detail.metrics.lastFixAt)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                GNSS receiver is {detail.metrics.gnssStatus.toLowerCase()} and location telemetry is being monitored centrally.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Camera Grid</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Six-camera status board for this workstation, including stream freshness and per-camera health notes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {detail.cameras.map((camera) => {
            const badge = cameraBadge(camera.status);
            return (
              <Card key={camera.id} className="glass rounded-2xl border-border/70">
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{camera.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{camera.position}</p>
                    </div>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>

                  <div className="aspect-video rounded-xl border border-border bg-card/30 flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Camera className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-xs">{camera.resolution}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <InfoTile icon={Camera} label="FPS" value={`${camera.fps}`} />
                    <InfoTile icon={Wifi} label="Last Frame" value={timeAgo(camera.lastFrameAt)} />
                  </div>

                  <div className="rounded-xl border border-border bg-card/30 p-3">
                    <p className="text-xs text-muted-foreground">Health Note</p>
                    <p className="text-sm text-foreground mt-1">{camera.healthNote}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  icon: Icon,
  label,
  value,
  tone = "default",
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
  tone?: "default" | "success" | "destructive";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/30 p-4">
      <div className={cn("flex items-center gap-2 text-muted-foreground", tone === "success" && "text-success", tone === "destructive" && "text-destructive")}>
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className={cn("mt-2 text-sm font-semibold text-foreground", tone === "success" && "text-success", tone === "destructive" && "text-destructive")}>
        {value}
      </p>
    </div>
  );
}
