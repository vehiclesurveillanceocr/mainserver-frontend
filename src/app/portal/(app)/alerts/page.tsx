"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCircle2,
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
  country: string;
  make: string;
  model: string;
  color: string;
  category: string;
  confidence: number;
  occurredAt: string;
  snapshotUrl: string | null;
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
  const { dictionary, isRTL, formatRelativeTime } = useLanguage();
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {events.map((event) => {
                    const detection = event.detection;
                    const status = statusConfig[event.alertStatus];
                    const StatusIcon = status.icon;
                    const priority = event.hitlistEntry?.priority?.toUpperCase() ?? null;
                    const isActionOpen = actionState?.eventId === event.id;

                    return (
                      <Card key={event.id} className="glass glass-hover transition-all rounded-xl border-border/60">
                        <CardContent className="p-5 space-y-4">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0 space-y-3">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-2xl font-bold font-mono tracking-wide text-foreground truncate force-ltr">
                                  {detection?.plate ?? event.hitlistEntry?.plateOriginal ?? copy.unknownPlate}
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

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{dictionary.common.vehicle}</p>
                                  <p className="mt-1 text-foreground">{getVehicleSummary(detection, copy.unknownVehicle)}</p>
                                </div>
                                <div>
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{dictionary.common.workstation}</p>
                                  <p className="mt-1 text-foreground">{event.workstation?.name ?? copy.unknownWorkstation}</p>
                                </div>
                              </div>

                              {event.hitlistEntry?.reasonSummary && (
                                <div className="rounded-lg border border-border bg-card/30 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.reasonSummary}</p>
                                  <p className="mt-1 text-sm text-foreground">{event.hitlistEntry.reasonSummary}</p>
                                </div>
                              )}

                              {event.note && (
                                <div className="rounded-lg border border-border/80 px-3 py-2">
                                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{copy.latestNote}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                                </div>
                              )}
                            </div>

                            <div className="text-xs text-muted-foreground shrink-0 force-ltr">
                              {formatRelativeTime(event.createdAt)}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
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

                          {isActionOpen && actionState && (
                            <div className="rounded-lg border border-border bg-card/30 p-3 space-y-3">
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
                        </CardContent>
                      </Card>
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
