"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useLanguage } from "@/components/language-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  ListChecks,
  Plus,
  ChevronRight,
  ChevronDown,
  Loader2,
  AlertCircle,
  X,
  Upload,
  Hash,
  Shield,
} from "lucide-react";

type HitlistStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

interface HitlistEntry {
  id: string;
  plateOriginal: string;
  plateNormalized: string;
  countryOrRegion: string | null;
  priority: string | null;
  status: string;
  reasonCode: string | null;
  reasonSummary: string | null;
  vehicleMake: string | null;
  vehicleModel: string | null;
  vehicleColor: string | null;
}

interface HitlistVersion {
  id: string;
  versionNumber: number;
  entries: HitlistEntry[];
  note: string | null;
  createdAt: string;
}

interface Hitlist {
  id: string;
  name: string;
  description: string | null;
  status: HitlistStatus;
  currentVersionNumber: number;
  versions: HitlistVersion[];
  createdAt: string;
  updatedAt: string;
}

type ApiResp<T> = { success: true; data: T } | { success: false; error: string };

function statusBadgeVariant(status: HitlistStatus): "success" | "warning" | "secondary" {
  const map: Record<HitlistStatus, "success" | "warning" | "secondary"> = {
    ACTIVE: "success",
    DRAFT: "warning",
    ARCHIVED: "secondary",
  };
  return map[status];
}

export default function WatchlistPage() {
  const { dictionary, isRTL, formatDate } = useLanguage();
  const copy = dictionary.watchlist;
  const common = dictionary.common;

  const [hitlists, setHitlists] = useState<Hitlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailData, setDetailData] = useState<Hitlist | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showAddVersion, setShowAddVersion] = useState<string | null>(null);
  const [versionNote, setVersionNote] = useState("");
  const [versionEntries, setVersionEntries] = useState("");
  const [addingVersion, setAddingVersion] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await api.get<ApiResp<Hitlist[]>>("/api/hitlists");
      if (resp.success) setHitlists(resp.data);
      else setError(resp.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.listError);
    } finally {
      setLoading(false);
    }
  }, [copy.listError]);

  useEffect(() => { void fetchList(); }, [fetchList]);

  async function loadDetail(id: string) {
    if (expandedId === id) {
      setExpandedId(null);
      setDetailData(null);
      return;
    }
    setExpandedId(id);
    setDetailLoading(true);
    try {
      const resp = await api.get<ApiResp<Hitlist>>(`/api/hitlists/${id}`);
      if (resp.success) setDetailData(resp.data);
      else setError(resp.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.detailError);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;
    setCreating(true);
    try {
      const resp = await api.post<ApiResp<Hitlist>>("/api/hitlists", {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      if (resp.success) {
        setShowCreate(false);
        setCreateName("");
        setCreateDesc("");
        void fetchList();
      } else {
        setError(resp.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.createError);
    } finally {
      setCreating(false);
    }
  }

  async function handleAddVersion(hitlistId: string) {
    if (!versionEntries.trim()) return;
    setAddingVersion(true);
    try {
      const lines = versionEntries.trim().split("\n").filter(Boolean);
      const entries = lines.map((line) => {
        const parts = line.split(",").map((p) => p.trim());
        return {
          plateOriginal: parts[0] ?? "",
          countryOrRegion: parts[1] || undefined,
          priority: parts[2] || undefined,
          reasonSummary: parts[3] || undefined,
          vehicleMake: parts[4] || undefined,
          vehicleModel: parts[5] || undefined,
          vehicleColor: parts[6] || undefined,
        };
      });
      const resp = await api.post<ApiResp<HitlistVersion>>(
        `/api/hitlists/${hitlistId}/versions`,
        { note: versionNote.trim() || undefined, entries },
      );
      if (resp.success) {
        setShowAddVersion(null);
        setVersionNote("");
        setVersionEntries("");
        void fetchList();
        if (expandedId === hitlistId) await loadDetail(hitlistId);
      } else {
        setError(resp.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : copy.versionError);
    } finally {
      setAddingVersion(false);
    }
  }

  const activeCount = hitlists.filter((h) => h.status === "ACTIVE").length;
  const totalEntries = hitlists.reduce((sum, h) => sum + (h.versions?.[0]?.entries?.length ?? 0), 0);
  const statusLabel = (status: HitlistStatus) =>
    status === "ACTIVE" ? common.active :
    status === "DRAFT" ? common.draft :
    common.archived;

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{copy.subtitle}</p>
        </div>
        <Button
          type="button"
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium glow-primary"
        >
          <Plus className="h-4 w-4" />
          {copy.newHitlist}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: copy.totalHitlists, value: hitlists.length, icon: ListChecks },
          { label: common.active, value: activeCount, icon: Shield },
          { label: copy.totalEntries, value: totalEntries, icon: Hash },
        ].map((s) => (
          <Card key={s.label} className="glass rounded-xl">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-2.5 rounded-lg bg-card">
                <s.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-semibold text-foreground tabular-nums">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {error && (
        <div className="glass rounded-xl p-4 border border-destructive/30 bg-destructive/5 flex items-center gap-3">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
          <p className="text-sm text-destructive flex-1">{error}</p>
          <Button type="button" variant="ghost" size="icon" onClick={() => setError(null)} className="text-destructive hover:text-destructive/70 h-6 w-6">
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {showCreate && (
        <div className="glass-heavy rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">{copy.createHitlist}</h2>
            <Button type="button" variant="ghost" size="icon" onClick={() => setShowCreate(false)} className="text-muted-foreground hover:text-foreground h-6 w-6">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="hl-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.name}</Label>
              <Input
                id="hl-name"
                type="text"
                required
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder={copy.namePlaceholder}
                className="w-full bg-input border border-border"
              />
            </div>
            <div>
              <Label htmlFor="hl-desc" className="text-xs font-medium text-muted-foreground mb-1.5 block">{copy.descriptionOptional}</Label>
              <Input
                id="hl-desc"
                type="text"
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder={copy.descriptionPlaceholder}
                className="w-full bg-input border border-border"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="glass glass-hover">
                {common.cancel}
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? copy.creating : common.create}
              </Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : hitlists.length === 0 ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center justify-center text-center min-h-[300px]">
          <div className="glass rounded-full p-6 mb-4">
            <ListChecks className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-medium text-foreground mb-2">{copy.noHitlists}</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {copy.noHitlistsBody}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hitlists.map((h) => (
            <div key={h.id} className="glass rounded-xl overflow-hidden">
              <div className="w-full flex items-center gap-4 px-5 py-4 glass-hover transition-all">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => void loadDetail(h.id)}
                  className="flex-1 min-w-0 flex items-center gap-4 p-0 h-auto justify-start hover:bg-transparent"
                >
                  {expandedId === h.id ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 text-left">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-foreground truncate">{h.name}</span>
                      <Badge variant={statusBadgeVariant(h.status)} className="capitalize">
                        {statusLabel(h.status)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      v{h.currentVersionNumber} · {h.versions?.[0]?.entries?.length ?? 0} {copy.totalEntries.toLowerCase()} · {copy.created} {formatDate(h.createdAt)}
                    </p>
                  </div>
                </Button>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAddVersion(showAddVersion === h.id ? null : h.id)}
                    className="text-xs glass glass-hover"
                  >
                    <Upload className="h-3 w-3" />
                    {copy.addVersion}
                  </Button>
                </div>
              </div>

              {showAddVersion === h.id && (
                <div className="border-t border-border px-5 py-4 bg-card/30">
                  <h3 className="text-sm font-medium text-foreground mb-3">
                    {copy.addVersionTo} "{h.name}"
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor={`vnote-${h.id}`} className="text-xs text-muted-foreground mb-1 block">{copy.noteOptional}</Label>
                      <Input
                        id={`vnote-${h.id}`}
                        type="text"
                        value={versionNote}
                        onChange={(e) => setVersionNote(e.target.value)}
                        placeholder={copy.notePlaceholder}
                        className="w-full bg-input border border-border"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`ventries-${h.id}`} className="text-xs text-muted-foreground mb-1 block">
                        {copy.entriesHelp}
                      </Label>
                      <textarea
                        id={`ventries-${h.id}`}
                        rows={5}
                        value={versionEntries}
                        onChange={(e) => setVersionEntries(e.target.value)}
                        placeholder={"KA01AB1234, IN, HIGH, Stolen vehicle\nMH02CD5678, IN, MEDIUM, Wanted suspect"}
                        className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring font-mono resize-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => { setShowAddVersion(null); setVersionNote(""); setVersionEntries(""); }}
                        className="glass glass-hover"
                      >
                        {common.cancel}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingVersion || !versionEntries.trim()}
                        onClick={() => void handleAddVersion(h.id)}
                      >
                        {addingVersion ? copy.uploading : copy.uploadEntries}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {expandedId === h.id && (
                <div className="border-t border-border">
                  {detailLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : detailData ? (
                    <div className="px-5 py-4 space-y-4">
                      {detailData.description && (
                        <p className="text-sm text-muted-foreground">{detailData.description}</p>
                      )}

                      {detailData.versions.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          {copy.noVersionsYet}
                        </p>
                      ) : (
                        detailData.versions.map((v) => (
                          <div key={v.id} className="space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-medium text-foreground">
                                {copy.version} {v.versionNumber}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {v.entries.length} {copy.totalEntries.toLowerCase()} · {formatDate(v.createdAt)}
                              </span>
                              {v.note && (
                                <span className="text-xs text-muted-foreground italic">- {v.note}</span>
                              )}
                            </div>

                            {v.entries.length > 0 && (
                              <div className="overflow-x-auto rounded-lg border border-border">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-border bg-card/30">
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{common.plate}</th>
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{copy.normalized}</th>
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{common.country}</th>
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{common.priority}</th>
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{common.reason}</th>
                                      <th className="text-left px-3 py-2 text-muted-foreground font-medium">{common.vehicle}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {v.entries.slice(0, 20).map((entry) => (
                                      <tr key={entry.id} className="border-b border-border last:border-0">
                                        <td className="px-3 py-2 text-foreground font-mono force-ltr">{entry.plateOriginal}</td>
                                        <td className="px-3 py-2 text-muted-foreground font-mono force-ltr">{entry.plateNormalized}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{entry.countryOrRegion ?? "-"}</td>
                                        <td className="px-3 py-2">
                                          <Badge
                                            variant={
                                              entry.priority === "HIGH" ? "destructive"
                                                : entry.priority === "MEDIUM" ? "warning"
                                                : "outline"
                                            }
                                          >
                                            {entry.priority ?? "-"}
                                          </Badge>
                                        </td>
                                        <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">{entry.reasonSummary ?? "-"}</td>
                                        <td className="px-3 py-2 text-muted-foreground">
                                          {[entry.vehicleColor, entry.vehicleMake, entry.vehicleModel].filter(Boolean).join(" ") || "-"}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                                {v.entries.length > 20 && (
                                  <div className="px-3 py-2 text-xs text-muted-foreground text-center border-t border-border">
                                    {copy.showing} 20 {copy.of} {v.entries.length} {copy.totalEntries.toLowerCase()}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
