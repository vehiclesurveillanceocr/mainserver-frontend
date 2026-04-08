"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type UploadEntry = {
  plateOriginal: string;
  countryOrRegion?: string;
  priority?: string;
  reasonSummary?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleColor?: string;
};

const HEADER_ALIASES: Record<string, keyof UploadEntry> = {
  plate: "plateOriginal",
  platenumber: "plateOriginal",
  plateno: "plateOriginal",
  registrationnumber: "plateOriginal",
  country: "countryOrRegion",
  countryorregion: "countryOrRegion",
  region: "countryOrRegion",
  priority: "priority",
  severity: "priority",
  reason: "reasonSummary",
  reasonsummary: "reasonSummary",
  make: "vehicleMake",
  vehiclemake: "vehicleMake",
  model: "vehicleModel",
  vehiclemodel: "vehicleModel",
  color: "vehicleColor",
  vehiclecolor: "vehicleColor",
};

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map((value) => value.replace(/^"(.*)"$/, "$1").trim());
}

function parseCsvEntries(text: string): UploadEntry[] {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);

  if (rows.length === 0) return [];

  const firstRow = parseCsvLine(rows[0]);
  const normalizedHeader = firstRow.map((column) => column.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const hasHeader = normalizedHeader.some((column) => column in HEADER_ALIASES);

  const mapRow = (values: string[], headerMap?: Array<keyof UploadEntry | null>): UploadEntry => {
    if (headerMap) {
      const entry: UploadEntry = { plateOriginal: "" };
      headerMap.forEach((key, index) => {
        if (!key) return;
        const value = values[index]?.trim();
        if (!value) return;
        entry[key] = value;
      });
      return entry;
    }

    return {
      plateOriginal: values[0] ?? "",
      countryOrRegion: values[1] || undefined,
      priority: values[2] || undefined,
      reasonSummary: values[3] || undefined,
      vehicleMake: values[4] || undefined,
      vehicleModel: values[5] || undefined,
      vehicleColor: values[6] || undefined,
    };
  };

  if (hasHeader) {
    const headerMap = normalizedHeader.map((column) => HEADER_ALIASES[column] ?? null);
    return rows
      .slice(1)
      .map((row) => mapRow(parseCsvLine(row), headerMap))
      .filter((entry) => entry.plateOriginal.trim());
  }

  return rows
    .map((row) => mapRow(parseCsvLine(row)))
    .filter((entry) => entry.plateOriginal.trim());
}

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
  const [createFileName, setCreateFileName] = useState("");
  const [createEntries, setCreateEntries] = useState<UploadEntry[]>([]);
  const [creating, setCreating] = useState(false);
  const createFileInputRef = useRef<HTMLInputElement | null>(null);

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

  async function parseUploadFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new Error(copy.unsupportedFileType);
    }

    const text = await file.text();
    const entries = parseCsvEntries(text);
    if (entries.length === 0) {
      throw new Error(copy.uploadRequired);
    }
    return entries;
  }

  async function handleCreateFileChange(file: File | null) {
    if (!file) return;
    try {
      const entries = await parseUploadFile(file);
      setCreateEntries(entries);
      setCreateFileName(file.name);
      if (!createName.trim()) {
        setCreateName(file.name.replace(/\.csv$/i, ""));
      }
      setError(null);
    } catch (e) {
      setCreateEntries([]);
      setCreateFileName("");
      setError(e instanceof Error ? e.message : copy.invalidSheet);
    }
  }

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
    if (!createName.trim() || createEntries.length === 0) {
      setError(copy.uploadRequired);
      return;
    }
    setCreating(true);
    try {
      const resp = await api.post<ApiResp<Hitlist>>("/api/hitlists", {
        name: createName.trim(),
        description: createDesc.trim() || undefined,
      });
      if (resp.success) {
        const versionResp = await api.post<ApiResp<HitlistVersion>>(
          `/api/hitlists/${resp.data.id}/versions`,
          { note: "Initial import", entries: createEntries },
        );
        if (!versionResp.success) {
          setError(versionResp.error);
          return;
        }
        setShowCreate(false);
        setCreateName("");
        setCreateDesc("");
        setCreateFileName("");
        setCreateEntries([]);
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
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground block">{copy.uploadSheet}</Label>
              <button
                type="button"
                onClick={() => createFileInputRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-border bg-card/20 px-5 py-8 text-center transition hover:border-primary/40 hover:bg-card/40"
              >
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-card">
                  <Upload className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">{copy.dragAndDrop}</p>
                <p className="mt-1 text-xs text-muted-foreground">{copy.csvOnly}</p>
              </button>
              <input
                ref={createFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => void handleCreateFileChange(e.target.files?.[0] ?? null)}
              />
              <div className="rounded-lg border border-border/70 bg-card/20 px-3 py-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{copy.selectedFile}:</span>{" "}
                {createFileName || copy.noFileSelected}
              </div>
              <p className="text-xs text-muted-foreground">{copy.expectedColumns}</p>
              <p className="text-xs text-muted-foreground">{copy.uploadSheetHelp}</p>
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} className="glass glass-hover">
                {common.cancel}
              </Button>
              <Button type="submit" disabled={creating || createEntries.length === 0}>
                {creating ? copy.creating : copy.createWithUpload}
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
              </div>

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
