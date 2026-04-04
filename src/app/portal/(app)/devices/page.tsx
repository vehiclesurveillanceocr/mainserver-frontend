"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Cpu, HardDrive, MemoryStick, MonitorSmartphone, RefreshCw, Router, Wifi, WifiOff, AlertCircle, Camera, MapPinned, Satellite } from "lucide-react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
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

function cameraSummary(cameras: CameraInfo[]) {
  return {
    online: cameras.filter((camera) => camera.status === "ONLINE").length,
    degraded: cameras.filter((camera) => camera.status === "DEGRADED").length,
    offline: cameras.filter((camera) => camera.status === "OFFLINE").length,
    maintenance: cameras.filter((camera) => camera.status === "MAINTENANCE").length,
  };
}

export default function DevicesPage() {
  const { dictionary, isRTL, formatRelativeTime } = useLanguage();
  const copy = dictionary.devices;
  const common = dictionary.common;

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
      setError(e instanceof Error ? e.message : copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [copy.loadError]);

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
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {copy.subtitle}
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
          {common.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <SummaryCard icon={Router} label={copy.workstations} value={summary.workstations} />
        <SummaryCard icon={Wifi} label={common.online} value={summary.onlineWorkstations} tone="success" />
        <SummaryCard icon={MonitorSmartphone} label={copy.tabletLinked} value={summary.linkedTablets} />
        <SummaryCard icon={Camera} label={copy.totalCameras} value={summary.totalCameras} />
        <SummaryCard icon={HardDrive} label={copy.liveCameras} value={summary.onlineCameras} tone="success" />
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

  function WorkstationCard({ item }: { item: WorkstationDetail }) {
    const summary = cameraSummary(item.cameras);
    const workstationLabel =
      item.workstation.status === "ACTIVE" ? common.online :
      item.workstation.status === "OFFLINE" ? common.offline :
      item.workstation.status === "PENDING" ? common.pending :
      common.disabled;

    return (
      <Card className="glass glass-hover rounded-2xl border-border/70 transition-all">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-foreground truncate">{item.workstation.name}</h2>
              <p className="text-xs text-muted-foreground mt-1 force-ltr">{item.workstation.deviceId}</p>
              {item.workstation.description && (
                <p className="text-sm text-muted-foreground mt-2">{item.workstation.description}</p>
              )}
            </div>
            <Badge variant={item.workstation.status === "ACTIVE" ? "success" : item.workstation.status === "OFFLINE" ? "destructive" : item.workstation.status === "PENDING" ? "warning" : "secondary"}>
              {workstationLabel}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricMini icon={Cpu} label={common.cpu} value={`${item.metrics.cpuUsagePercent}%`} />
            <MetricMini icon={MemoryStick} label={common.memory} value={`${item.metrics.memoryUsagePercent}%`} />
            <MetricMini icon={HardDrive} label={common.storage} value={`${item.metrics.storageUsagePercent}%`} />
            <MetricMini icon={Wifi} label={common.uplink} value={`${item.metrics.networkUplinkMbps} Mbps`} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-card/30 p-4">
              <p className="text-xs text-muted-foreground">{copy.tablet}</p>
              <div className="mt-2 flex items-center gap-2">
                {item.tabletStatus.connectedToWorkstation ? (
                  <Wifi className="h-4 w-4 text-success" />
                ) : (
                  <WifiOff className="h-4 w-4 text-destructive" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {item.tablet ? item.tablet.name : copy.noTabletLinked}
                </p>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {item.tabletStatus.connectedToWorkstation
                  ? `${common.battery} ${item.tabletStatus.batteryLevel}% · ${common.signal} ${item.tabletStatus.signalStrength}`
                  : copy.tabletDisconnected}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card/30 p-4">
              <p className="text-xs text-muted-foreground">{copy.cameraFleet}</p>
              <p className="mt-2 text-sm font-medium text-foreground">{item.cameras.length} {copy.camerasConfigured}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.online} {common.online.toLowerCase()} · {summary.degraded} {common.degraded.toLowerCase()} · {summary.offline} {common.offline.toLowerCase()} · {summary.maintenance} {common.maintenance.toLowerCase()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <MetricMini icon={MapPinned} label={common.gps} value={item.metrics.gpsStatus} />
            <MetricMini icon={Satellite} label={common.gnss} value={item.metrics.gnssStatus} />
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-xs text-muted-foreground">
              {common.lastSeen} <span className="force-ltr">{formatRelativeTime(item.workstation.lastSeenAt)}</span> · {common.uptime} {item.metrics.uptimeHours}h · {common.temperature} {item.metrics.temperatureC}°C
            </div>
            <Button asChild className="gap-2">
              <Link href={`/portal/devices/${item.workstation.id}`}>{copy.openWorkstation}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
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
