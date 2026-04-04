"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Clock3,
  FileUp,
  Loader2,
  RefreshCw,
  ServerCog,
  ShieldAlert,
  Truck,
  Upload,
} from "lucide-react";
import type { UpdateRollout, UpdateRolloutStatus, WorkstationDetail } from "@/types/domain";

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

export default function UpdatesPage() {
  const { dictionary, isRTL, formatDateTime } = useLanguage();
  const copy = dictionary.updatesPage;
  const common = dictionary.common;

  const [workstations, setWorkstations] = useState<WorkstationDetail[]>([]);
  const [rollouts, setRollouts] = useState<UpdateRollout[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const vehicleWorkstations = useMemo(
    () => workstations.filter((entry) => entry.workstation.deploymentProfile === "vehicle"),
    [workstations],
  );

  async function loadAll(silent = false) {
    if (silent) setRefreshing(true);
    else setLoading(true);

    setError(null);
    try {
      const [wsResp, rolloutResp] = await Promise.all([
        api.get<ApiResp<WorkstationDetail[]>>("/api/workstations"),
        api.get<ApiResp<UpdateRollout[]>>("/api/updates/rollouts"),
      ]);

      if (!wsResp.success) throw new Error(wsResp.error);
      if (!rolloutResp.success) throw new Error(rolloutResp.error);

      setWorkstations(wsResp.data);
      setRollouts(rolloutResp.data);
      if (!silent && selectedIds.length === 0) {
        setSelectedIds(wsResp.data.filter((item) => item.workstation.deploymentProfile === "vehicle").map((item) => item.workstation.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.loadError);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  async function handleCreateRollout(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setError(copy.fileRequired);
      return;
    }
    if (!version.trim()) {
      setError(copy.versionRequired);
      return;
    }
    if (!selectedIds.length) {
      setError(copy.noVehicleTargets);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await api.post<ApiResp<UpdateRollout>>("/api/updates/rollouts", {
        version: version.trim(),
        fileName: selectedFile.name,
        fileSizeBytes: selectedFile.size,
        releaseNotes: releaseNotes.trim() || undefined,
        workstationIds: selectedIds,
      });

      if (!response.success) throw new Error(response.error);

      setVersion("");
      setReleaseNotes("");
      setSelectedFile(null);
      await loadAll(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.createError);
    } finally {
      setSaving(false);
    }
  }

  const latestArtifact = rollouts[0]?.artifact ?? null;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
        </div>
        <Button type="button" variant="outline" className="glass glass-hover gap-2" onClick={() => void loadAll(true)} disabled={refreshing}>
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {common.refresh}
        </Button>
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="glass xl:col-span-2">
          <CardContent className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{copy.createRollout}</h2>
            </div>

            <form onSubmit={handleCreateRollout} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.packageFile}</Label>
                  <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/20 p-4 text-center">
                    <FileUp className="h-5 w-5 text-muted-foreground mb-2" />
                    <span className="text-sm text-foreground">{selectedFile ? selectedFile.name : copy.chooseFile}</span>
                    <span className="text-xs text-muted-foreground mt-1">{copy.uploadHint}</span>
                    <input
                      type="file"
                      accept=".deb"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="rollout-version" className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.version}</Label>
                    <Input
                      id="rollout-version"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      placeholder={copy.versionPlaceholder}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rollout-notes" className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.releaseNotes}</Label>
                    <textarea
                      id="rollout-notes"
                      rows={3}
                      value={releaseNotes}
                      onChange={(e) => setReleaseNotes(e.target.value)}
                      placeholder={copy.notesPlaceholder}
                      className="w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h3 className="text-sm font-medium text-foreground">{copy.targetVehicles}</h3>
                    <p className="text-xs text-muted-foreground">{selectedIds.length} {copy.selectedTargets}</p>
                  </div>
                  {vehicleWorkstations.length > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="glass glass-hover"
                      onClick={() => setSelectedIds(vehicleWorkstations.map((item) => item.workstation.id))}
                    >
                      {common.vehicleWorkstations}
                    </Button>
                  )}
                </div>

                {vehicleWorkstations.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card/20 p-4 text-sm text-muted-foreground">
                    {copy.noVehicleTargets}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {vehicleWorkstations.map((item) => {
                      const checked = selectedIds.includes(item.workstation.id);
                      return (
                        <label key={item.workstation.id} className={cn("flex items-start gap-3 rounded-xl border p-4 cursor-pointer", checked ? "border-primary/30 bg-primary/5" : "border-border bg-card/20")}>
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedIds((current) =>
                                e.target.checked
                                  ? [...current, item.workstation.id]
                                  : current.filter((id) => id !== item.workstation.id),
                              )
                            }
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground">{item.workstation.name}</p>
                            <p className="text-xs text-muted-foreground force-ltr">{item.workstation.deviceId}</p>
                            <p className="text-xs text-muted-foreground mt-1">{item.workstation.description}</p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving || vehicleWorkstations.length === 0} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ServerCog className="h-4 w-4" />}
                  {copy.createRollout}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">{copy.packageSummary}</h2>
            </div>

            {latestArtifact ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-xl border border-border bg-card/20 p-4">
                  <p className="text-xs text-muted-foreground">{copy.latestArtifact}</p>
                  <p className="mt-2 font-medium text-foreground force-ltr">{latestArtifact.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">v{latestArtifact.version} · {formatFileSize(latestArtifact.fileSizeBytes)}</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <SummaryStat icon={CheckCircle2} label={copy.completeDevices} value={String(rollouts[0]?.statuses.filter((s) => s.status === "COMPLETED").length ?? 0)} tone="success" />
                  <SummaryStat icon={Clock3} label={copy.receivedDevices} value={String(rollouts[0]?.statuses.filter((s) => s.status === "RECEIVED").length ?? 0)} tone="warning" />
                  <SummaryStat icon={ShieldAlert} label={copy.pendingDevices} value={String(rollouts[0]?.statuses.filter((s) => s.status === "PENDING").length ?? 0)} tone="default" />
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-card/20 p-4 text-sm text-muted-foreground">
                {copy.noRolloutsBody}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="glass">
        <CardContent className="p-6 space-y-5">
          <div className="flex items-center gap-2">
            <ServerCog className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-foreground">{copy.currentRollouts}</h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center min-h-[220px]">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : rollouts.length === 0 ? (
            <div className="rounded-xl border border-border bg-card/20 p-10 text-center">
              <p className="text-sm font-medium text-foreground">{copy.noRollouts}</p>
              <p className="text-sm text-muted-foreground mt-1">{copy.noRolloutsBody}</p>
            </div>
          ) : (
            <div className="space-y-5">
              {rollouts.map((rollout) => (
                <RolloutCard
                  key={rollout.id}
                  rollout={rollout}
                  workstations={workstations}
                  copy={copy}
                  formatDateTime={formatDateTime}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryStat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof CheckCircle2;
  label: string;
  value: string;
  tone: "success" | "warning" | "default";
}) {
  return (
    <div className="rounded-xl border border-border bg-card/20 p-3">
      <div className={cn("flex items-center gap-2 text-muted-foreground", tone === "success" && "text-success", tone === "warning" && "text-warning")}>
        <Icon className="h-4 w-4" />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function RolloutCard({
  rollout,
  workstations,
  copy,
  formatDateTime,
}: {
  rollout: UpdateRollout;
  workstations: WorkstationDetail[];
  copy: ReturnType<typeof useLanguage>["dictionary"]["updatesPage"];
  formatDateTime: (value: string, options?: Intl.DateTimeFormatOptions) => string;
}) {
  const statusMeta = (status: UpdateRolloutStatus) =>
    status === "COMPLETED"
      ? { label: copy.completed, variant: "success" as const }
      : status === "RECEIVED"
        ? { label: copy.received, variant: "warning" as const }
        : status === "FAILED"
          ? { label: copy.failed, variant: "destructive" as const }
          : { label: copy.pending, variant: "secondary" as const };

  return (
    <div className="rounded-2xl border border-border bg-card/20 p-5 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-foreground force-ltr">{rollout.artifact.fileName}</p>
          <p className="text-xs text-muted-foreground mt-1">v{rollout.artifact.version} · {formatDateTime(rollout.createdAt)}</p>
          {rollout.artifact.releaseNotes && (
            <p className="text-sm text-muted-foreground mt-2">{rollout.artifact.releaseNotes}</p>
          )}
        </div>
        <Badge variant="outline">{copy.rolloutTargets}: {rollout.statuses.length}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rollout.statuses.map((target) => {
          const workstation = workstations.find((item) => item.workstation.id === target.workstationId)?.workstation;
          const meta = statusMeta(target.status);

          return (
            <div key={target.workstationId} className="rounded-xl border border-border bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{workstation?.name ?? target.workstationId}</p>
                  <p className="text-xs text-muted-foreground force-ltr">{workstation?.deviceId ?? target.workstationId}</p>
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>{copy.assigned}: {formatDateTime(target.assignedAt)}</p>
                {target.receivedAt && <p>{copy.received}: {formatDateTime(target.receivedAt)}</p>}
                {target.completedAt && <p>{copy.completed}: {formatDateTime(target.completedAt)}</p>}
                {target.note && <p>{target.note}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
