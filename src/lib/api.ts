import {
  addHitlistVersion,
  createUpdateRollout,
  createHitlist,
  createPairing,
  getWorkstationDetail,
  getAlertStats,
  getHitlist,
  listAlerts,
  listDevices,
  listSearchDetections,
  listSystemHealthTimeline,
  listHitlists,
  listUpdateRollouts,
  listWorkstations,
  portalScan,
  updateRolloutStatus,
  updateAlert,
} from "@/mocks/store";
import type { MatchStatus, UpdateRolloutStatus } from "@/types/domain";
import { LANGUAGE_STORAGE_KEY, type Language } from "@/lib/i18n";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type Envelope<T> = { success: true; data: T } | { success: false; error: string };

function ok<T>(data: T): Envelope<T> {
  return { success: true, data };
}

function parseUrl(path: string) {
  return new URL(path, "http://localhost");
}

function resolveLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const language = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return language === "ar" ? "ar" : "en";
}

function parseBody(body?: unknown): unknown {
  if (typeof body !== "string") {
    return undefined;
  }

  return JSON.parse(body);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = parseUrl(path);
  const payload = parseBody(options.body);
  const language = resolveLanguage();

  if (url.pathname === "/api/devices" && (!options.method || options.method === "GET")) {
    return ok(listDevices(language)) as T;
  }

  if (url.pathname === "/api/workstations" && (!options.method || options.method === "GET")) {
    return ok(listWorkstations(language)) as T;
  }

  if (url.pathname === "/api/detections/search" && (!options.method || options.method === "GET")) {
    return ok(listSearchDetections(language)) as T;
  }

  if (url.pathname === "/api/analytics/system-health" && (!options.method || options.method === "GET")) {
    return ok(listSystemHealthTimeline()) as T;
  }

  if (url.pathname.startsWith("/api/workstations/") && (!options.method || options.method === "GET")) {
    const workstationId = url.pathname.split("/")[3];
    const detail = getWorkstationDetail(workstationId, language);
    if (!detail) {
      throw new ApiError(404, "Workstation not found.");
    }
    return ok(detail) as T;
  }

  if (url.pathname === "/api/devices/pairings" && options.method === "POST") {
    const body = payload as { workstationId?: string; tabletId?: string } | undefined;
    if (!body?.workstationId || !body?.tabletId) {
      throw new ApiError(400, "workstationId and tabletId are required.");
    }
    return ok(createPairing(body.workstationId, body.tabletId)) as T;
  }

  if (url.pathname === "/api/hitlists" && (!options.method || options.method === "GET")) {
    return ok(listHitlists(true, language)) as T;
  }

  if (url.pathname === "/api/updates/rollouts" && (!options.method || options.method === "GET")) {
    return ok(listUpdateRollouts(language)) as T;
  }

  if (url.pathname === "/api/updates/rollouts" && options.method === "POST") {
    const body = payload as {
      version?: string;
      fileName?: string;
      fileSizeBytes?: number;
      releaseNotes?: string | null;
      workstationIds?: string[];
    } | undefined;

    if (!body?.version?.trim() || !body?.fileName?.trim() || !body.workstationIds?.length) {
      throw new ApiError(400, "version, fileName, and workstationIds are required.");
    }

    return ok(createUpdateRollout({
      version: body.version.trim(),
      fileName: body.fileName.trim(),
      fileSizeBytes: Number(body.fileSizeBytes ?? 0),
      releaseNotes: body.releaseNotes ?? null,
      workstationIds: body.workstationIds,
    })) as T;
  }

  if (url.pathname.startsWith("/api/updates/rollouts/") && options.method === "PATCH") {
    const rolloutId = url.pathname.split("/")[4];
    const body = payload as {
      workstationId?: string;
      status?: UpdateRolloutStatus;
      note?: string | null;
    } | undefined;

    if (!rolloutId || !body?.workstationId || !body?.status) {
      throw new ApiError(400, "rolloutId, workstationId, and status are required.");
    }

    return ok(updateRolloutStatus(rolloutId, body.workstationId, body.status, body.note ?? null)) as T;
  }

  if (url.pathname === "/api/hitlists" && options.method === "POST") {
    const body = payload as { name?: string; description?: string } | undefined;
    if (!body?.name?.trim()) {
      throw new ApiError(400, "Hitlist name is required.");
    }
    return ok(createHitlist(body.name.trim(), body.description)) as T;
  }

  if (url.pathname.startsWith("/api/hitlists/") && url.pathname.endsWith("/versions") && options.method === "POST") {
    const hitlistId = url.pathname.split("/")[3];
    const body = payload as { note?: string; entries?: Array<Record<string, unknown>> } | undefined;
    return ok(addHitlistVersion(hitlistId, body?.entries ?? [], body?.note)) as T;
  }

  if (url.pathname.startsWith("/api/hitlists/") && (!options.method || options.method === "GET")) {
    const hitlistId = url.pathname.split("/")[3];
    const hitlist = getHitlist(hitlistId, language);
    if (!hitlist) {
      throw new ApiError(404, "Hitlist not found.");
    }
    return ok(hitlist) as T;
  }

  if (url.pathname === "/api/match-events/stats") {
    return ok(getAlertStats()) as T;
  }

  if (url.pathname === "/api/match-events" && (!options.method || options.method === "GET")) {
    const status = url.searchParams.get("status") as MatchStatus | null;
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "20");
    return ok(listAlerts(status ?? undefined, page, limit, language)) as T;
  }

  if (url.pathname.startsWith("/api/match-events/") && options.method === "PATCH") {
    const id = url.pathname.split("/")[3];
    const body = payload as { alertStatus?: MatchStatus; note?: string } | undefined;
    if (!body?.alertStatus) {
      throw new ApiError(400, "alertStatus is required.");
    }
    return ok(updateAlert(id, body.alertStatus, body.note ?? null)) as T;
  }

  if (url.pathname === "/api/portal/scan" && options.method === "POST") {
    const body = payload as {
      plate?: string;
      country?: string | null;
      make?: string | null;
      model?: string | null;
      color?: string | null;
      category?: string | null;
      confidence?: number | null;
      occurredAt?: string;
    } | undefined;

    if (!body?.plate?.trim()) {
      throw new ApiError(400, "plate is required.");
    }

    return ok(portalScan({
      plate: body.plate.trim(),
      country: body.country,
      make: body.make,
      model: body.model,
      color: body.color,
      category: body.category,
      confidence: body.confidence,
      occurredAt: body.occurredAt,
    })) as T;
  }

  throw new ApiError(404, `Unhandled mock endpoint: ${url.pathname}`);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};
