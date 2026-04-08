"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Loader2,
  Radio,
  ShieldAlert,
  XCircle,
} from "lucide-react";

type MatchStatus = "ALL" | "PENDING" | "ACKNOWLEDGED" | "ESCALATED" | "FALSE_POSITIVE" | "RESOLVED";
type AlertStatus = Exclude<MatchStatus, "ALL">;
type ActionStatus = Exclude<AlertStatus, "PENDING">;

interface MatchEventDetection {
  plate: string;
  secondaryPlate: string | null;
  code: string | null;
  emirate: string | null;
  country: string;
  make: string;
  model: string;
  color: string;
  category: string;
  confidence: number;
  occurredAt: string;
  snapshotUrl: string | null;
  plateImageUrl: string | null;
  vehicleImageUrl: string | null;
  cameraName: string | null;
  heightCharacter: number | null;
  scannedBy: string | null;
  latitude: number | null;
}

interface MatchEventWorkstation {
  name: string;
  deviceId: string;
}

interface MatchEventHitlistEntry {
  plateOriginal: string;
  reasonSummary: string | null;
  priority: string | null;
  caseReference: string | null;
}

interface MatchEvent {
  id: string;
  alertStatus: AlertStatus;
  note: string | null;
  createdAt: string;
  detection: MatchEventDetection | null;
  workstation: MatchEventWorkstation | null;
  hitlistEntry: MatchEventHitlistEntry | null;
}

interface MatchEventsPageData {
  items: MatchEvent[];
  total: number;
  page: number;
  limit: number;
}

interface MatchEventStats {
  PENDING: number;
  ACKNOWLEDGED: number;
  ESCALATED: number;
  FALSE_POSITIVE: number;
  RESOLVED: number;
  total: number;
}

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function priorityVariant(priority: string | null): "destructive" | "warning" | "secondary" | "outline" {
  if (priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  if (priority === "LOW") return "secondary";
  return "outline";
}

function getTabCount(tab: MatchStatus, stats: MatchEventStats | null): number | null {
  if (!stats) return null;
  if (tab === "ALL") return stats.total;
  return stats[tab];
}

function getVehicleSummary(detection: MatchEventDetection | null, unknownVehicle: string): string {
  if (!detection) return unknownVehicle;
  const parts = [detection.make, detection.model, detection.color, detection.category].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : unknownVehicle;
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background/40 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm text-foreground break-words">{value}</p>
    </div>
  );
}

function ImagePanel({
  label,
  src,
  fallback,
}: {
  label: string;
  src: string | null;
  fallback: string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/30">
        {src ? (
          <img src={src} alt={label} className="h-28 w-full object-cover" />
        ) : (
          <div className="flex h-28 items-center justify-center text-sm text-muted-foreground">
            {fallback}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState() {
  const { dictionary } = useLanguage();
  const copy = dictionary.alerts;

  const statusConfig = {
    PENDING: { label: copy.pending, color: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
    ACKNOWLEDGED: { label: copy.acknowledged, color: "bg-info/10 text-info border-info/20", icon: Eye },
    ESCALATED: { label: copy.escalated, color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
    FALSE_POSITIVE: { label: copy.falsePositive, color: "bg-muted text-muted-foreground border-border", icon: XCircle },
    RESOLVED: { label: copy.resolved, color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  } as const;

  return (
    <div className="glass rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[400px]">
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
        <div className="relative glass rounded-full p-6">
          <Bell className="h-10 w-10 text-muted-foreground" />
        </div>
      </div>
      <h2 className="text-lg font-medium text-foreground mb-2">{copy.awaitingTitle}</h2>
      <p className="text-sm text-muted-foreground max-w-md">
        {copy.awaitingBody}
      </p>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-5 gap-3 w-full max-w-2xl">
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <Badge
              key={key}
              variant="outline"
              className={cn("rounded-lg flex items-center gap-2 px-3 py-2 text-xs font-normal", config.color)}
            >
              <Icon className="h-3.5 w-3.5" />
              {config.label}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const { dictionary, isRTL, formatDate, formatRelativeTime, formatTime } = useLanguage();
  const copy = dictionary.alerts;

  const statusConfig: Record<Exclude<MatchStatus, "ALL">, { label: string; color: string; icon: typeof Bell }> = {
    PENDING: { label: copy.pending, color: "bg-warning/10 text-warning border-warning/20", icon: AlertTriangle },
    ACKNOWLEDGED: { label: copy.acknowledged, color: "bg-info/10 text-info border-info/20", icon: Eye },
    ESCALATED: { label: copy.escalated, color: "bg-destructive/10 text-destructive border-destructive/20", icon: ShieldAlert },
    FALSE_POSITIVE: { label: copy.falsePositive, color: "bg-muted text-muted-foreground border-border", icon: XCircle },
    RESOLVED: { label: copy.resolved, color: "bg-success/10 text-success border-success/20", icon: CheckCircle2 },
  };

  const tabs: { value: MatchStatus; label: string }[] = [
    { value: "ALL", label: copy.all },
    { value: "PENDING", label: copy.pending },
    { value: "ACKNOWLEDGED", label: copy.acknowledged },
    { value: "ESCALATED", label: copy.escalated },
    { value: "FALSE_POSITIVE", label: copy.falsePositive },
    { value: "RESOLVED", label: copy.resolved },
  ];

  const actionLabels: Record<ActionStatus, string> = {
    ACKNOWLEDGED: copy.acknowledge,
    ESCALATED: copy.escalate,
    FALSE_POSITIVE: copy.falsePositive,
    RESOLVED: copy.resolve,
  };

  const actionStatuses: ActionStatus[] = ["ACKNOWLEDGED", "ESCALATED", "FALSE_POSITIVE", "RESOLVED"];

  const [activeTab, setActiveTab] = useState<MatchStatus>("ALL");
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [stats, setStats] = useState<MatchEventStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [actionState, setActionState] = useState<{ eventId: string; nextStatus: ActionStatus; note: string } | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const hasMore = events.length < total;

  const fetchStats = useCallback(async () => {
    const resp = await api.get<ApiResp<MatchEventStats>>("/api/match-events/stats");
    if (!resp.success) throw new Error(resp.error);
    return resp.data;
  }, []);

  const fetchPage = useCallback(async (status: MatchStatus, pageToLoad: number) => {
    const params = new URLSearchParams({ page: String(pageToLoad), limit: "20" });
    if (status !== "ALL") params.set("status", status);

    const resp = await api.get<ApiResp<MatchEventsPageData>>(`/api/match-events?${params.toString()}`);
    if (!resp.success) throw new Error(resp.error);
    return resp.data;
  }, []);

  const loadInitial = useCallback(async (status: MatchStatus) => {
    setLoading(true);
    setError(null);
    try {
      const [pageData, statsData] = await Promise.all([fetchPage(status, 1), fetchStats()]);
      setEvents(pageData.items);
      setPage(pageData.page);
      setTotal(pageData.total);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
      setEvents([]);
      setTotal(0);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, fetchPage, fetchStats]);

  const refreshLoadedPages = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const pageCount = Math.max(page, 1);
      const pageResults = await Promise.all(
        Array.from({ length: pageCount }, (_, index) => fetchPage(activeTab, index + 1)),
      );
      const latest = pageResults[pageResults.length - 1];
      const statsData = await fetchStats();

      setEvents(pageResults.flatMap((result) => result.items));
      setPage(latest.page);
      setTotal(latest.total);
      setStats(statsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.refreshError);
    } finally {
      setRefreshing(false);
    }
  }, [activeTab, copy.refreshError, fetchPage, fetchStats, page]);

  useEffect(() => {
    setActionState(null);
    setExpandedIds([]);
    void loadInitial(activeTab);
  }, [activeTab, loadInitial]);

  const tabCounts = useMemo(
    () => Object.fromEntries(tabs.map((tab) => [tab.value, getTabCount(tab.value, stats)])) as Record<MatchStatus, number | null>,
    [stats, tabs],
  );

  async function handleLoadMore() {
    if (loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);
    try {
      const nextPage = page + 1;
      const pageData = await fetchPage(activeTab, nextPage);
      setEvents((current) => [...current, ...pageData.items]);
      setPage(pageData.page);
      setTotal(pageData.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadMoreError);
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleConfirmAction() {
    if (!actionState) return;

    setSubmittingId(actionState.eventId);
    setError(null);

    try {
      const resp = await api.patch<ApiResp<MatchEvent>>(`/api/match-events/${actionState.eventId}`, {
        alertStatus: actionState.nextStatus,
        note: actionState.note.trim() || undefined,
      });

      if (!resp.success) {
        setError(resp.error);
        return;
      }

      setActionState(null);
      await refreshLoadedPages();
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.updateError);
    } finally {
      setSubmittingId(null);
    }
  }

  function toggleExpanded(eventId: string) {
    setExpandedIds((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId],
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
          <Radio className="h-3 w-3 animate-pulse text-primary" />
          {refreshing ? dictionary.common.refreshing : dictionary.common.liveMonitoring}
        </div>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void loadInitial(activeTab)}
            className="glass glass-hover"
          >
            {dictionary.common.retry}
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MatchStatus)}>
        <TabsList className="flex gap-2 flex-wrap bg-transparent p-0 h-auto">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                "glass glass-hover text-muted-foreground hover:text-foreground",
                "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none",
              )}
            >
              <span>{tab.label}</span>
              {tabCounts[tab.value] !== null && (
                <span className={cn("rounded-full bg-black/10 px-2 py-0.5 text-[11px] leading-none data-[state=active]:bg-primary-foreground/20", isRTL ? "mr-2" : "ml-2")}>
                  {tabCounts[tab.value]}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="mt-6">
            {loading ? (
              <div className="glass rounded-xl min-h-[400px] flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : events.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-border/60">
                  {events.map((event) => {
                    const detection = event.detection;
                    const status = statusConfig[event.alertStatus];
                    const StatusIcon = status.icon;
                    const priority = event.hitlistEntry?.priority?.toUpperCase() ?? null;
                    const isActionOpen = actionState?.eventId === event.id;
                    const isExpanded = expandedIds.includes(event.id);
                    const ExpandIcon = isExpanded ? ChevronUp : ChevronDown;
                    const plateValue = detection?.plate ?? event.hitlistEntry?.plateOriginal ?? copy.unknownPlate;
                    const vehicleSummary = getVehicleSummary(detection, copy.unknownVehicle);
                    const workstationName = event.workstation?.name ?? copy.unknownWorkstation;
                    const confidenceValue = detection ? `${Math.round(detection.confidence * 100)}%` : dictionary.common.notAvailable;
                    const eventDate = detection?.occurredAt ? formatDate(detection.occurredAt) : dictionary.common.notAvailable;
                    const eventTime = detection?.occurredAt ? formatTime(detection.occurredAt) : dictionary.common.notAvailable;
                    const snapshotAvailability = detection?.snapshotUrl ? dictionary.common.available : dictionary.common.unavailable;

                    return (
                      <div
                        key={event.id}
                        className={cn(
                          "glass transition-all",
                          "border-b border-border/60 last:border-b-0",
                          isExpanded && "bg-card/20",
                        )}
                      >
                        <div className="p-4 sm:p-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1 space-y-4">
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-lg font-bold font-mono tracking-wide text-foreground force-ltr">
                                      {plateValue}
                                    </span>
                                    <Badge
                                      variant="outline"
                                      className={cn("inline-flex items-center gap-1.5", status.color)}
                                    >
                                      <StatusIcon className="h-3.5 w-3.5" />
                                      {status.label}
                                    </Badge>
                                    {priority && (
                                      <Badge variant={priorityVariant(priority)}>
                                        {priority} {copy.prioritySuffix}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-sm text-foreground break-words">{vehicleSummary}</p>
                                </div>

                                <div className="flex flex-wrap items-start gap-2 lg:max-w-xs lg:justify-end">
                                  {event.hitlistEntry?.reasonSummary && (
                                    <div className="max-w-xs rounded-md border border-border/80 bg-card/35 px-2.5 py-1.5 text-right">
                                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{copy.reasonSummary}</p>
                                      <p className="mt-0.5 text-xs text-foreground line-clamp-2 break-words">{event.hitlistEntry.reasonSummary}</p>
                                    </div>
                                  )}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => toggleExpanded(event.id)}
                                    className="glass glass-hover text-xs font-medium border-primary/30"
                                    aria-expanded={isExpanded}
                                  >
                                    <ExpandIcon className="h-3.5 w-3.5" />
                                    {isExpanded ? copy.hideDetails : copy.showDetails}
                                  </Button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-5">
                                <div className="min-w-0">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{dictionary.common.workstation}</p>
                                  <p className="mt-1 text-foreground break-words">{workstationName}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.date}</p>
                                  <p className="mt-1 text-foreground">{eventDate}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.time}</p>
                                  <p className="mt-1 text-foreground">{eventTime}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{dictionary.common.confidence}</p>
                                  <p className="mt-1 text-foreground">{confidenceValue}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestNote}</p>
                                  <p className="mt-1 text-foreground break-words">{event.note ?? dictionary.common.notAvailable}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex shrink-0 flex-wrap items-center gap-2 xl:max-w-[18rem] xl:justify-end">
                              <div className="text-xs text-muted-foreground force-ltr xl:mr-1">
                                {formatRelativeTime(event.createdAt)}
                              </div>
                              {actionStatuses.filter((nextStatus) => nextStatus !== event.alertStatus).map((nextStatus) => (
                                <Button
                                  key={nextStatus}
                                  type="button"
                                  size="sm"
                                  variant={isActionOpen && actionState?.nextStatus === nextStatus ? "default" : "outline"}
                                  onClick={() => {
                                    setActionState((current) =>
                                      current?.eventId === event.id && current.nextStatus === nextStatus
                                        ? null
                                        : { eventId: event.id, nextStatus, note: "" },
                                    );
                                  }}
                                  className={cn(
                                    "text-xs",
                                    !(isActionOpen && actionState?.nextStatus === nextStatus) && "glass glass-hover",
                                  )}
                                  disabled={submittingId === event.id}
                                >
                                  {actionLabels[nextStatus]}
                                </Button>
                              ))}
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-4 space-y-4 rounded-xl border border-border/60 bg-background/30 p-4">
                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                                <ImagePanel
                                  label={copy.plateImage}
                                  src={detection?.plateImageUrl ?? null}
                                  fallback={copy.noImage}
                                />
                                <ImagePanel
                                  label={dictionary.common.snapshot}
                                  src={detection?.snapshotUrl ?? null}
                                  fallback={copy.noImage}
                                />
                                <ImagePanel
                                  label={copy.vehicleImage}
                                  src={detection?.vehicleImageUrl ?? null}
                                  fallback={copy.noImage}
                                />
                              </div>

                              <div className="space-y-2">
                                <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.details}</p>
                                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
                                  <DetailItem label={dictionary.common.plate} value={plateValue} />
                                  <DetailItem label={copy.secondaryPlate} value={detection?.secondaryPlate ?? dictionary.common.notAvailable} />
                                  <DetailItem label={copy.code} value={detection?.code ?? dictionary.common.notAvailable} />
                                  <DetailItem label={copy.emirate} value={detection?.emirate ?? dictionary.common.notAvailable} />
                                  <DetailItem label={dictionary.common.country} value={detection?.country ?? dictionary.common.notAvailable} />
                                  <DetailItem label={dictionary.common.vehicle} value={vehicleSummary} />
                                  <DetailItem label={dictionary.common.confidence} value={confidenceValue} />
                                  <DetailItem label={copy.cameraName} value={detection?.cameraName ?? dictionary.common.notAvailable} />
                                  <DetailItem label={dictionary.common.workstation} value={workstationName} />
                                  <DetailItem label="Device ID" value={event.workstation?.deviceId ?? dictionary.common.notAvailable} />
                                  <DetailItem label={copy.date} value={eventDate} />
                                  <DetailItem label={copy.time} value={eventTime} />
                                  <DetailItem label={dictionary.common.timestamp} value={event.createdAt} />
                                  <DetailItem label={copy.scannedBy} value={detection?.scannedBy ?? dictionary.common.notAvailable} />
                                  <DetailItem label={copy.heightCharacter} value={detection?.heightCharacter != null ? String(detection.heightCharacter) : dictionary.common.notAvailable} />
                                  <DetailItem label={copy.latitude} value={detection?.latitude != null ? detection.latitude.toFixed(6) : dictionary.common.notAvailable} />
                                  <DetailItem label={dictionary.common.snapshot} value={snapshotAvailability} />
                                  <DetailItem label={dictionary.common.priority} value={priority ?? dictionary.common.notAvailable} />
                                  <DetailItem label="Case Reference" value={event.hitlistEntry?.caseReference ?? dictionary.common.notAvailable} />
                                  <DetailItem label={dictionary.common.reason} value={event.hitlistEntry?.reasonSummary ?? dictionary.common.notAvailable} />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Hitlist</p>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{dictionary.common.plate}: </span>
                                      <span className="font-mono force-ltr">{event.hitlistEntry?.plateOriginal ?? dictionary.common.notAvailable}</span>
                                    </p>
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{dictionary.common.priority}: </span>
                                      {priority ?? dictionary.common.notAvailable}
                                    </p>
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{dictionary.common.reason}: </span>
                                      {event.hitlistEntry?.reasonSummary ?? dictionary.common.notAvailable}
                                    </p>
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">Case Reference: </span>
                                      {event.hitlistEntry?.caseReference ?? dictionary.common.notAvailable}
                                    </p>
                                  </div>
                                </div>

                                <div className="rounded-lg border border-border/70 bg-background/40 px-4 py-3">
                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Operator</p>
                                  <div className="mt-2 space-y-2 text-sm">
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{copy.latestNote}: </span>
                                      {event.note ?? dictionary.common.notAvailable}
                                    </p>
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{dictionary.common.status}: </span>
                                      {status.label}
                                    </p>
                                    <p className="text-foreground break-words">
                                      <span className="text-muted-foreground">{dictionary.common.timestamp}: </span>
                                      {event.createdAt}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {isActionOpen && actionState && (
                            <div className="mt-4 rounded-lg border border-border bg-card/30 p-3 space-y-3">
                              <div>
                                <Label
                                  htmlFor={`note-${event.id}`}
                                  className="text-xs font-medium text-muted-foreground mb-1.5 block"
                                >
                                  {copy.optionalNoteFor} {actionLabels[actionState.nextStatus].toLowerCase()}
                                </Label>
                                <Input
                                  id={`note-${event.id}`}
                                  type="text"
                                  value={actionState.note}
                                  onChange={(e) =>
                                    setActionState((current) =>
                                      current ? { ...current, note: e.target.value } : current,
                                    )
                                  }
                                  placeholder={copy.operatorNote}
                                  className="w-full bg-input border border-border"
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setActionState(null)}
                                  className="glass glass-hover"
                                  disabled={submittingId === event.id}
                                >
                                  {dictionary.common.cancel}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void handleConfirmAction()}
                                  disabled={submittingId === event.id}
                                >
                                  {submittingId === event.id && <Loader2 className={cn("h-3.5 w-3.5 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
                                  {copy.confirm} {actionLabels[actionState.nextStatus]}
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {hasMore && (
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleLoadMore()}
                      disabled={loadingMore}
                      className="glass glass-hover"
                    >
                      {loadingMore && <Loader2 className={cn("h-4 w-4 animate-spin", isRTL ? "ml-2" : "mr-2")} />}
                      {copy.loadMore}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
