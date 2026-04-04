import type {
  AppUser,
  CameraStatus,
  DevicePairing,
  Hitlist,
  HitlistEntry,
  HitlistVersion,
  MatchEvent,
  MatchStatus,
  SearchDetection,
  SessionData,
  SystemHealthPoint,
  Tablet,
  TabletRuntimeStatus,
  UpdateArtifact,
  UpdateRollout,
  UpdateRolloutStatus,
  WorkstationUpdateStatus,
  Workstation,
  WorkstationCamera,
  WorkstationDetail,
  WorkstationMetrics,
} from "@/types/domain";
import type { Language } from "@/lib/i18n";

type Listener = () => void;

interface MockStoreState {
  session: SessionData | null;
  users: Array<AppUser & { password: string }>;
  workstations: Workstation[];
  tablets: Tablet[];
  pairings: DevicePairing[];
  workstationCameras: WorkstationCamera[];
  workstationMetrics: WorkstationMetrics[];
  tabletStatuses: TabletRuntimeStatus[];
  hitlists: Hitlist[];
  alerts: MatchEvent[];
  updateRollouts: UpdateRollout[];
}

const createdAtBase = Date.now();

const MOCK_TEXT_AR: Record<string, string> = {
  Admin: "المسؤول",
  admin: "المسؤول",
  "Field Scanner": "الماسح الميداني",
  "Checkpoint Alpha": "نقطة التفتيش ألفا",
  "North gate ANPR workstation": "محطة قراءة لوحات عند البوابة الشمالية",
  "Highway Patrol Van": "مركبة دورية الطريق السريع",
  "Mobile patrol workstation": "محطة عمل دورية متنقلة",
  "Operator Tablet 1": "جهاز المشغل اللوحي 1",
  "Response unit tablet": "جهاز لوحي لوحدة الاستجابة",
  "Front Left": "الأمامي الأيسر",
  "Front Right": "الأمامي الأيمن",
  "Rear Left": "الخلفي الأيسر",
  "Rear Right": "الخلفي الأيمن",
  "Cabin Left": "المقصورة اليسرى",
  "Cabin Right": "المقصورة اليمنى",
  "Entry lane 1": "مسار الدخول 1",
  "Entry lane 2": "مسار الدخول 2",
  "Exit lane 1": "مسار الخروج 1",
  "Exit lane 2": "مسار الخروج 2",
  "Side overview": "عرض جانبي",
  "Secondary overview": "عرض ثانوي",
  "Patrol front": "مقدمة الدورية",
  "Patrol front secondary": "المقدمة الثانوية للدورية",
  "Rear lane left": "المسار الخلفي الأيسر",
  "Rear lane right": "المسار الخلفي الأيمن",
  "Vehicle interior left": "داخل المركبة الأيسر",
  "Vehicle interior right": "داخل المركبة الأيمن",
  "Capturing normally": "الالتقاط يعمل بشكل طبيعي",
  "Stable stream": "البث مستقر",
  "Intermittent packet loss": "فقدان حزم متقطع",
  "Lens replacement scheduled": "تمت جدولة استبدال العدسة",
  "Workstation offline": "محطة العمل غير متصلة",
  "Stolen Vehicles": "المركبات المسروقة",
  "Priority vehicles flagged for interception": "مركبات ذات أولوية تم تمييزها للاعتراض",
  "Initial import": "الاستيراد الأولي",
  "Stolen vehicle": "مركبة مسروقة",
  "Wanted vehicle": "مركبة مطلوبة",
  "City Police": "شرطة المدينة",
  "Regional Task Force": "قوة المهام الإقليمية",
  "Vehicle seen near north gate": "تم رصد المركبة قرب البوابة الشمالية",
  "Officer dispatched": "تم إرسال الضابط",
  Toyota: "تويوتا",
  Innova: "إنوفا",
  Honda: "هوندا",
  City: "سيتي",
  Hyundai: "هيونداي",
  Creta: "كريتا",
  Maruti: "ماروتي",
  Baleno: "بالينو",
  Mahindra: "ماهيندرا",
  Bolero: "بوليرو",
  White: "أبيض",
  Black: "أسود",
  Silver: "فضي",
  Blue: "أزرق",
  Grey: "رمادي",
  SUV: "دفع رباعي",
  Sedan: "سيدان",
  Vehicle: "مركبة",
  "Silver Hyundai Creta": "هيونداي كريتا فضية",
  "Blue Maruti Baleno": "ماروتي بالينو زرقاء",
  "Grey Mahindra Bolero": "ماهيندرا بوليرو رمادية",
};

function currentLanguage(): Language {
  if (typeof window === "undefined") {
    return "en";
  }

  const lang = window.localStorage.getItem("surveillance-language");
  return lang === "ar" ? "ar" : "en";
}

function iso(offsetMs = 0): string {
  return new Date(createdAtBase + offsetMs).toISOString();
}

function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

function tr(value: string | null | undefined, language: Language): string | null | undefined {
  if (value == null || language === "en") return value;
  return MOCK_TEXT_AR[value] ?? value;
}

function localizeSession(session: SessionData | null, language: Language): SessionData | null {
  if (!session) return null;
  return clone({
    ...session,
    user: {
      ...session.user,
      name: tr(session.user.name, language)!,
    },
  });
}

function localizeDevices(language: Language) {
  return {
    workstations: store.workstations.map((workstation) => ({
      ...workstation,
      name: tr(workstation.name, language)!,
      description: tr(workstation.description, language) ?? null,
    })),
    tablets: store.tablets.map((tablet) => ({
      ...tablet,
      name: tr(tablet.name, language)!,
      description: tr(tablet.description ?? null, language) ?? null,
    })),
    pairings: store.pairings,
  };
}

function localizeWorkstationDetailRow(detail: WorkstationDetail, language: Language): WorkstationDetail {
  return {
    ...detail,
    workstation: {
      ...detail.workstation,
      name: tr(detail.workstation.name, language)!,
      description: tr(detail.workstation.description, language) ?? null,
    },
    tablet: detail.tablet
      ? {
          ...detail.tablet,
          name: tr(detail.tablet.name, language)!,
          description: tr(detail.tablet.description ?? null, language) ?? null,
        }
      : null,
    cameras: detail.cameras.map((camera) => ({
      ...camera,
      name: tr(camera.name, language)!,
      position: tr(camera.position, language)!,
      healthNote: tr(camera.healthNote, language)!,
    })),
  };
}

function localizeHitlist(hitlist: Hitlist, language: Language): Hitlist {
  return {
    ...hitlist,
    name: tr(hitlist.name, language)!,
    description: tr(hitlist.description ?? null, language) ?? null,
    versions: hitlist.versions.map((version) => ({
      ...version,
      note: tr(version.note ?? null, language) ?? null,
      entries: version.entries.map((entry) => ({
        ...entry,
        reasonSummary: tr(entry.reasonSummary ?? null, language) ?? null,
        sourceAgency: tr(entry.sourceAgency ?? null, language) ?? null,
        vehicleMake: tr(entry.vehicleMake ?? null, language) ?? null,
        vehicleModel: tr(entry.vehicleModel ?? null, language) ?? null,
        vehicleColor: tr(entry.vehicleColor ?? null, language) ?? null,
      })),
    })),
  };
}

function localizeAlert(alert: MatchEvent, language: Language): MatchEvent {
  return {
    ...alert,
    note: tr(alert.note ?? null, language) ?? null,
    detection: alert.detection
      ? {
          ...alert.detection,
          make: tr(alert.detection.make, language)!,
          model: tr(alert.detection.model, language)!,
          color: tr(alert.detection.color, language)!,
          category: tr(alert.detection.category, language)!,
        }
      : null,
    workstation: alert.workstation
      ? {
          ...alert.workstation,
          name: tr(alert.workstation.name, language)!,
        }
      : null,
    hitlistEntry: alert.hitlistEntry
      ? {
          ...alert.hitlistEntry,
          reasonSummary: tr(alert.hitlistEntry.reasonSummary ?? null, language) ?? null,
        }
      : null,
  };
}

function localizeUpdateRollout(rollout: UpdateRollout, language: Language): UpdateRollout {
  return {
    ...rollout,
    artifact: {
      ...rollout.artifact,
      releaseNotes: tr(rollout.artifact.releaseNotes ?? null, language) ?? null,
    },
    statuses: rollout.statuses.map((status) => ({
      ...status,
      note: tr(status.note ?? null, language) ?? null,
    })),
  };
}

function createCameraSet(
  workstationId: string,
  presets: Array<{
    name: string;
    position: string;
    status: CameraStatus;
    fps: number;
    resolution: string;
    lastFrameOffsetMinutes: number | null;
    healthNote: string;
  }>,
): WorkstationCamera[] {
  return presets.map((camera, index) => ({
    id: `${workstationId}-cam-${index + 1}`,
    workstationId,
    name: camera.name,
    position: camera.position,
    status: camera.status,
    fps: camera.fps,
    resolution: camera.resolution,
    lastFrameAt: camera.lastFrameOffsetMinutes === null ? null : iso(-1000 * 60 * camera.lastFrameOffsetMinutes),
    healthNote: camera.healthNote,
  }));
}

const store: MockStoreState = {
  session: {
    user: {
      id: "user-admin-1",
      name: "Admin",
      email: "admin@surveillance.com",
      role: "admin",
    },
  },
  users: [
    {
      id: "user-admin-1",
      name: "admin",
      email: "admin@surveillance.com",
      role: "admin",
      password: "admin@123",
    },
    {
      id: "user-scanner-1",
      name: "Field Scanner",
      email: "scanner@scanner.com",
      role: "scanner",
      password: "scanner",
    },
  ],
  workstations: [
    {
      id: "ws-1",
      deviceId: "ws-001",
      name: "Checkpoint Alpha",
      description: "North gate ANPR workstation",
      deploymentProfile: "fixed",
      status: "ACTIVE",
      lastSeenAt: iso(-1000 * 60 * 2),
      createdAt: iso(-1000 * 60 * 60 * 24 * 7),
    },
    {
      id: "ws-2",
      deviceId: "ws-002",
      name: "Highway Patrol Van",
      description: "Mobile patrol workstation",
      deploymentProfile: "vehicle",
      status: "OFFLINE",
      lastSeenAt: iso(-1000 * 60 * 90),
      createdAt: iso(-1000 * 60 * 60 * 24 * 4),
    },
  ],
  tablets: [
    {
      id: "tablet-1",
      deviceId: "tab-101",
      name: "Operator Tablet 1",
      description: "Response unit tablet",
      status: "ACTIVE",
      lastSeenAt: iso(-1000 * 60),
      createdAt: iso(-1000 * 60 * 60 * 24 * 3),
    },
  ],
  pairings: [
    {
      id: "pair-1",
      workstationId: "ws-1",
      tabletId: "tablet-1",
      createdAt: iso(-1000 * 60 * 60 * 12),
      unpairedAt: null,
    },
  ],
  workstationCameras: [
    ...createCameraSet("ws-1", [
      { name: "Front Left", position: "Entry lane 1", status: "ONLINE", fps: 24, resolution: "1920x1080", lastFrameOffsetMinutes: 0, healthNote: "Capturing normally" },
      { name: "Front Right", position: "Entry lane 2", status: "ONLINE", fps: 24, resolution: "1920x1080", lastFrameOffsetMinutes: 0, healthNote: "Capturing normally" },
      { name: "Rear Left", position: "Exit lane 1", status: "ONLINE", fps: 18, resolution: "1920x1080", lastFrameOffsetMinutes: 1, healthNote: "Stable stream" },
      { name: "Rear Right", position: "Exit lane 2", status: "DEGRADED", fps: 12, resolution: "1280x720", lastFrameOffsetMinutes: 2, healthNote: "Intermittent packet loss" },
      { name: "Cabin Left", position: "Side overview", status: "ONLINE", fps: 15, resolution: "1280x720", lastFrameOffsetMinutes: 0, healthNote: "Stable stream" },
      { name: "Cabin Right", position: "Secondary overview", status: "MAINTENANCE", fps: 0, resolution: "1280x720", lastFrameOffsetMinutes: null, healthNote: "Lens replacement scheduled" },
    ]),
    ...createCameraSet("ws-2", [
      { name: "Front Left", position: "Patrol front", status: "OFFLINE", fps: 0, resolution: "1920x1080", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
      { name: "Front Right", position: "Patrol front secondary", status: "OFFLINE", fps: 0, resolution: "1920x1080", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
      { name: "Rear Left", position: "Rear lane left", status: "OFFLINE", fps: 0, resolution: "1280x720", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
      { name: "Rear Right", position: "Rear lane right", status: "OFFLINE", fps: 0, resolution: "1280x720", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
      { name: "Cabin Left", position: "Vehicle interior left", status: "OFFLINE", fps: 0, resolution: "1280x720", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
      { name: "Cabin Right", position: "Vehicle interior right", status: "OFFLINE", fps: 0, resolution: "1280x720", lastFrameOffsetMinutes: 95, healthNote: "Workstation offline" },
    ]),
  ],
  workstationMetrics: [
    {
      workstationId: "ws-1",
      cpuUsagePercent: 46,
      memoryUsagePercent: 62,
      storageUsagePercent: 58,
      uptimeHours: 132,
      networkUplinkMbps: 18.4,
      temperatureC: 51,
      gpsStatus: "LOCKED",
      gnssStatus: "LOCKED",
      satelliteCount: 17,
      lastFixAt: iso(-1000 * 18),
    },
    {
      workstationId: "ws-2",
      cpuUsagePercent: 0,
      memoryUsagePercent: 0,
      storageUsagePercent: 73,
      uptimeHours: 0,
      networkUplinkMbps: 0,
      temperatureC: 0,
      gpsStatus: "OFFLINE",
      gnssStatus: "SEARCHING",
      satelliteCount: 0,
      lastFixAt: iso(-1000 * 60 * 95),
    },
  ],
  tabletStatuses: [
    {
      workstationId: "ws-1",
      tabletId: "tablet-1",
      connectedToWorkstation: true,
      batteryLevel: 78,
      memoryUsagePercent: 41,
      signalStrength: "STRONG",
      appVersion: "2.3.1",
      lastHeartbeatAt: iso(-1000 * 60),
    },
    {
      workstationId: "ws-2",
      tabletId: null,
      connectedToWorkstation: false,
      batteryLevel: null,
      memoryUsagePercent: null,
      signalStrength: "DISCONNECTED",
      appVersion: null,
      lastHeartbeatAt: null,
    },
  ],
  hitlists: [
    {
      id: "hitlist-1",
      name: "Stolen Vehicles",
      description: "Priority vehicles flagged for interception",
      status: "ACTIVE",
      currentVersionNumber: 1,
      createdAt: iso(-1000 * 60 * 60 * 48),
      updatedAt: iso(-1000 * 60 * 30),
      versions: [
        {
          id: "version-1",
          versionNumber: 1,
          note: "Initial import",
          createdAt: iso(-1000 * 60 * 60 * 48),
          entries: [
            {
              id: "entry-1",
              plateOriginal: "KA01AB1234",
              plateNormalized: "KA01AB1234",
              countryOrRegion: "IN",
              priority: "HIGH",
              status: "active",
              reasonSummary: "Stolen vehicle",
              caseReference: "CASE-1001",
              sourceAgency: "City Police",
              vehicleMake: "Toyota",
              vehicleModel: "Innova",
              vehicleColor: "White",
              createdAt: iso(-1000 * 60 * 60 * 48),
            },
            {
              id: "entry-2",
              plateOriginal: "TN09CD5678",
              plateNormalized: "TN09CD5678",
              countryOrRegion: "IN",
              priority: "MEDIUM",
              status: "active",
              reasonSummary: "Wanted vehicle",
              caseReference: "CASE-1002",
              sourceAgency: "Regional Task Force",
              vehicleMake: "Honda",
              vehicleModel: "City",
              vehicleColor: "Black",
              createdAt: iso(-1000 * 60 * 60 * 48),
            },
          ],
        },
      ],
    },
  ],
  alerts: [
    {
      id: "alert-1",
      alertStatus: "PENDING",
      note: "Vehicle seen near north gate",
      createdAt: iso(-1000 * 60 * 18),
      detection: {
        plate: "KA01AB1234",
        country: "IN",
        make: "Toyota",
        model: "Innova",
        color: "White",
        category: "SUV",
        confidence: 0.96,
        occurredAt: iso(-1000 * 60 * 18),
        snapshotUrl: null,
      },
      workstation: {
        name: "Checkpoint Alpha",
        deviceId: "ws-001",
      },
      hitlistEntry: {
        id: "entry-1",
        plateOriginal: "KA01AB1234",
        reasonSummary: "Stolen vehicle",
        priority: "HIGH",
        caseReference: "CASE-1001",
      },
    },
    {
      id: "alert-2",
      alertStatus: "ACKNOWLEDGED",
      note: "Officer dispatched",
      createdAt: iso(-1000 * 60 * 72),
      detection: {
        plate: "TN09CD5678",
        country: "IN",
        make: "Honda",
        model: "City",
        color: "Black",
        category: "Sedan",
        confidence: 0.89,
        occurredAt: iso(-1000 * 60 * 72),
        snapshotUrl: null,
      },
      workstation: {
        name: "Highway Patrol Van",
        deviceId: "ws-002",
      },
      hitlistEntry: {
        id: "entry-2",
        plateOriginal: "TN09CD5678",
        reasonSummary: "Wanted vehicle",
        priority: "MEDIUM",
        caseReference: "CASE-1002",
      },
    },
  ],
  updateRollouts: [
    {
      id: "rollout-1",
      artifact: {
        id: "artifact-1",
        version: "2.3.1",
        fileName: "surveillance-agent_2.3.1_arm64.deb",
        fileSizeBytes: 48318361,
        releaseNotes: "Stable stream",
        packageType: ".deb",
        createdAt: iso(-1000 * 60 * 60 * 26),
      },
      targetProfile: "vehicle",
      createdAt: iso(-1000 * 60 * 60 * 24),
      statuses: [
        {
          workstationId: "ws-2",
          status: "RECEIVED",
          assignedAt: iso(-1000 * 60 * 60 * 24),
          receivedAt: iso(-1000 * 60 * 60 * 20),
          completedAt: null,
          note: "Package downloaded while connected at depot",
        },
      ],
    },
  ],
};

const listeners = new Set<Listener>();
let sessionSnapshot: SessionData | null = clone(store.session);
let localizedSessionCache: Record<Language, SessionData | null> = {
  en: localizeSession(sessionSnapshot, "en"),
  ar: localizeSession(sessionSnapshot, "ar"),
};

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function refreshSessionCache(): void {
  localizedSessionCache = {
    en: localizeSession(sessionSnapshot, "en"),
    ar: localizeSession(sessionSnapshot, "ar"),
  };
}

function latestVersion(hitlist: Hitlist): HitlistVersion | undefined {
  return [...hitlist.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
}

function getTabletForWorkstation(workstationId: string): Tablet | null {
  const pairing = store.pairings.find((entry) => entry.workstationId === workstationId && !entry.unpairedAt);
  if (!pairing) {
    return null;
  }

  return store.tablets.find((tablet) => tablet.id === pairing.tabletId) ?? null;
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSession(language: Language = currentLanguage()): SessionData | null {
  return localizedSessionCache[language];
}

export function signIn(email: string, password: string): { session?: SessionData; error?: string } {
  const user = store.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
  if (!user || user.password !== password) {
    return { error: "Invalid email or password." };
  }

  store.session = {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
  sessionSnapshot = clone(store.session);
  refreshSessionCache();
  notify();
  return { session: sessionSnapshot };
}

export function signOut(): void {
  store.session = null;
  sessionSnapshot = null;
  refreshSessionCache();
  notify();
}

export function updateProfile(name: string): SessionData {
  if (!store.session) {
    throw new Error("No active session.");
  }

  store.session.user.name = name;
  const user = store.users.find((entry) => entry.id === store.session?.user.id);
  if (user) {
    user.name = name;
  }

  sessionSnapshot = clone(store.session);
  refreshSessionCache();
  notify();
  return sessionSnapshot;
}

export function changePassword(currentPassword: string, newPassword: string): void {
  if (!store.session) {
    throw new Error("No active session.");
  }

  const user = store.users.find((entry) => entry.id === store.session?.user.id);
  if (!user || user.password !== currentPassword) {
    throw new Error("Current password is incorrect.");
  }

  user.password = newPassword;
  notify();
}

export function listDevices(language: Language = currentLanguage()) {
  return clone(localizeDevices(language));
}

export function listWorkstations(language: Language = currentLanguage()): WorkstationDetail[] {
  return clone(
    store.workstations.map((workstation) => ({
      workstation,
      tablet: getTabletForWorkstation(workstation.id),
      metrics: store.workstationMetrics.find((entry) => entry.workstationId === workstation.id)!,
      tabletStatus: store.tabletStatuses.find((entry) => entry.workstationId === workstation.id)!,
      cameras: store.workstationCameras.filter((camera) => camera.workstationId === workstation.id),
    })).map((detail) => localizeWorkstationDetailRow(detail, language)),
  );
}

export function listSearchDetections(language: Language = currentLanguage()): SearchDetection[] {
  const alertRows: SearchDetection[] = store.alerts
    .filter((alert) => alert.detection && alert.workstation)
    .map((alert) => ({
      id: alert.id,
      plate: alert.detection!.plate,
      timestamp: alert.detection!.occurredAt,
      workstationName: tr(alert.workstation!.name, language)!,
      workstationDeviceId: alert.workstation!.deviceId,
      confidence: Math.round(alert.detection!.confidence * 100),
      country: alert.detection!.country,
      vehicle: [
        tr(alert.detection!.color, language),
        tr(alert.detection!.make, language),
        tr(alert.detection!.model, language),
      ]
        .filter(Boolean)
        .join(" "),
      source: "ALERT",
      snapshotUrl: alert.detection!.snapshotUrl,
    }));

  const patrolRows: SearchDetection[] = [
    {
      id: "scan-1",
      plate: "MH12EF4581",
      timestamp: iso(-1000 * 60 * 8),
      workstationName: tr("Checkpoint Alpha", language)!,
      workstationDeviceId: "ws-001",
      confidence: 93,
      country: "IN",
      vehicle: tr("Silver Hyundai Creta", language)!,
      source: "SCAN",
      snapshotUrl: null,
    },
    {
      id: "scan-2",
      plate: "KL07PQ1122",
      timestamp: iso(-1000 * 60 * 27),
      workstationName: tr("Checkpoint Alpha", language)!,
      workstationDeviceId: "ws-001",
      confidence: 88,
      country: "IN",
      vehicle: tr("Blue Maruti Baleno", language)!,
      source: "SCAN",
      snapshotUrl: null,
    },
    {
      id: "scan-3",
      plate: "KA05MN9044",
      timestamp: iso(-1000 * 60 * 114),
      workstationName: tr("Highway Patrol Van", language)!,
      workstationDeviceId: "ws-002",
      confidence: 81,
      country: "IN",
      vehicle: tr("Grey Mahindra Bolero", language)!,
      source: "SCAN",
      snapshotUrl: null,
    },
  ];

  return clone(
    [...alertRows, ...patrolRows].sort(
      (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime(),
    ),
  );
}

export function listSystemHealthTimeline(): SystemHealthPoint[] {
  return clone([
    { label: "06:00", cpuUsagePercent: 34, memoryUsagePercent: 52, networkUplinkMbps: 16.8, alertCount: 0 },
    { label: "08:00", cpuUsagePercent: 41, memoryUsagePercent: 56, networkUplinkMbps: 18.2, alertCount: 1 },
    { label: "10:00", cpuUsagePercent: 47, memoryUsagePercent: 61, networkUplinkMbps: 19.4, alertCount: 1 },
    { label: "12:00", cpuUsagePercent: 53, memoryUsagePercent: 64, networkUplinkMbps: 17.9, alertCount: 2 },
    { label: "14:00", cpuUsagePercent: 58, memoryUsagePercent: 67, networkUplinkMbps: 15.6, alertCount: 3 },
    { label: "16:00", cpuUsagePercent: 49, memoryUsagePercent: 63, networkUplinkMbps: 18.7, alertCount: 1 },
    { label: "18:00", cpuUsagePercent: 45, memoryUsagePercent: 59, networkUplinkMbps: 20.3, alertCount: 0 },
    { label: "20:00", cpuUsagePercent: 39, memoryUsagePercent: 54, networkUplinkMbps: 17.2, alertCount: 0 },
  ]);
}

export function getWorkstationDetail(workstationId: string, language: Language = currentLanguage()): WorkstationDetail | null {
  const workstation = store.workstations.find((entry) => entry.id === workstationId);
  if (!workstation) {
    return null;
  }

  const metrics = store.workstationMetrics.find((entry) => entry.workstationId === workstationId);
  const tabletStatus = store.tabletStatuses.find((entry) => entry.workstationId === workstationId);

  if (!metrics || !tabletStatus) {
    return null;
  }

  return clone(localizeWorkstationDetailRow({
    workstation,
    tablet: getTabletForWorkstation(workstationId),
    metrics,
    tabletStatus,
    cameras: store.workstationCameras.filter((camera) => camera.workstationId === workstationId),
  }, language));
}

export function createPairing(workstationId: string, tabletId: string): DevicePairing {
  const pairing: DevicePairing = {
    id: `pair-${Date.now()}`,
    workstationId,
    tabletId,
    createdAt: new Date().toISOString(),
    unpairedAt: null,
  };
  store.pairings.unshift(pairing);
  notify();
  return clone(pairing);
}

export function listHitlists(summaryOnly = false, language: Language = currentLanguage()): Hitlist[] {
  if (!summaryOnly) {
    return clone(store.hitlists.map((hitlist) => localizeHitlist(hitlist, language)));
  }

  return clone(
    store.hitlists.map((hitlist) => {
      const version = latestVersion(hitlist);
      return {
        ...hitlist,
        versions: version
          ? [
              {
                ...version,
                entries: [],
              },
            ]
          : [],
      };
    }).map((hitlist) => localizeHitlist(hitlist, language)),
  );
}

export function getHitlist(id: string, language: Language = currentLanguage()): Hitlist | null {
  const hitlist = store.hitlists.find((entry) => entry.id === id);
  return hitlist ? clone(localizeHitlist(hitlist, language)) : null;
}

export function createHitlist(name: string, description?: string): Hitlist {
  const createdAt = new Date().toISOString();
  const hitlist: Hitlist = {
    id: `hitlist-${Date.now()}`,
    name,
    description: description ?? null,
    status: "ACTIVE",
    currentVersionNumber: 0,
    versions: [],
    createdAt,
    updatedAt: createdAt,
  };
  store.hitlists.unshift(hitlist);
  notify();
  return clone(hitlist);
}

export function addHitlistVersion(
  hitlistId: string,
  entries: Array<Partial<HitlistEntry>>,
  note?: string,
): HitlistVersion {
  const hitlist = store.hitlists.find((entry) => entry.id === hitlistId);
  if (!hitlist) {
    throw new Error("Hitlist not found.");
  }

  const createdAt = new Date().toISOString();
  const versionNumber = hitlist.currentVersionNumber + 1;
  const version: HitlistVersion = {
    id: `version-${Date.now()}`,
    versionNumber,
    note: note ?? null,
    createdAt,
    entries: entries.map((entry, index) => {
      const plateOriginal = String(entry.plateOriginal ?? "").trim();
      return {
        id: `entry-${Date.now()}-${index}`,
        plateOriginal,
        plateNormalized: normalizePlate(plateOriginal),
        countryOrRegion: entry.countryOrRegion ?? null,
        priority: entry.priority ?? null,
        status: "active",
        reasonSummary: entry.reasonSummary ?? null,
        caseReference: entry.caseReference ?? null,
        sourceAgency: entry.sourceAgency ?? null,
        vehicleMake: entry.vehicleMake ?? null,
        vehicleModel: entry.vehicleModel ?? null,
        vehicleColor: entry.vehicleColor ?? null,
        createdAt,
      };
    }),
  };

  hitlist.versions.unshift(version);
  hitlist.currentVersionNumber = versionNumber;
  hitlist.updatedAt = createdAt;
  notify();
  return clone(version);
}

export function listAlerts(status?: MatchStatus, page = 1, limit = 20, language: Language = currentLanguage()) {
  const filtered = status ? store.alerts.filter((entry) => entry.alertStatus === status) : store.alerts;
  const start = (page - 1) * limit;

  return clone({
    items: filtered.slice(start, start + limit).map((alert) => localizeAlert(alert, language)),
    total: filtered.length,
    page,
    limit,
  });
}

export function getAlertStats() {
  const counts = {
    PENDING: 0,
    ACKNOWLEDGED: 0,
    ESCALATED: 0,
    FALSE_POSITIVE: 0,
    RESOLVED: 0,
    total: store.alerts.length,
  };

  for (const alert of store.alerts) {
    counts[alert.alertStatus] += 1;
  }

  return counts;
}

export function updateAlert(id: string, status: MatchStatus, note?: string | null): MatchEvent {
  const alert = store.alerts.find((entry) => entry.id === id);
  if (!alert) {
    throw new Error("Alert not found.");
  }

  alert.alertStatus = status;
  alert.note = note ?? null;
  notify();
  return clone(alert);
}

export function listUpdateRollouts(language: Language = currentLanguage()): UpdateRollout[] {
  return clone(store.updateRollouts.map((rollout) => localizeUpdateRollout(rollout, language)));
}

export function createUpdateRollout(input: {
  version: string;
  fileName: string;
  fileSizeBytes: number;
  releaseNotes?: string | null;
  workstationIds: string[];
}): UpdateRollout {
  const createdAt = new Date().toISOString();
  const statuses: WorkstationUpdateStatus[] = input.workstationIds.map((workstationId) => ({
    workstationId,
    status: "PENDING",
    assignedAt: createdAt,
    receivedAt: null,
    completedAt: null,
    note: null,
  }));

  const rollout: UpdateRollout = {
    id: `rollout-${Date.now()}`,
    artifact: {
      id: `artifact-${Date.now()}`,
      version: input.version,
      fileName: input.fileName,
      fileSizeBytes: input.fileSizeBytes,
      releaseNotes: input.releaseNotes ?? null,
      packageType: ".deb",
      createdAt,
    },
    targetProfile: "vehicle",
    createdAt,
    statuses,
  };

  store.updateRollouts.unshift(rollout);
  notify();
  return clone(rollout);
}

export function updateRolloutStatus(
  rolloutId: string,
  workstationId: string,
  status: UpdateRolloutStatus,
  note?: string | null,
): UpdateRollout {
  const rollout = store.updateRollouts.find((entry) => entry.id === rolloutId);
  if (!rollout) {
    throw new Error("Update rollout not found.");
  }

  const target = rollout.statuses.find((entry) => entry.workstationId === workstationId);
  if (!target) {
    throw new Error("Workstation rollout target not found.");
  }

  target.status = status;
  target.note = note ?? target.note ?? null;
  if (status === "RECEIVED") {
    target.receivedAt = new Date().toISOString();
    target.completedAt = null;
  }
  if (status === "COMPLETED") {
    target.receivedAt = target.receivedAt ?? new Date().toISOString();
    target.completedAt = new Date().toISOString();
  }
  if (status === "FAILED") {
    target.completedAt = null;
  }
  notify();
  return clone(rollout);
}

export function portalScan(input: {
  plate: string;
  country?: string | null;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  category?: string | null;
  confidence?: number | null;
  occurredAt?: string;
}) {
  const normalizedPlate = normalizePlate(input.plate);
  const matchedEntries = store.hitlists.flatMap((hitlist) => {
    const version = latestVersion(hitlist);
    return (version?.entries ?? []).filter((entry) => entry.plateNormalized === normalizedPlate);
  });

  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const detectionId = `det-${Date.now()}`;
  const workstation = store.workstations[0] ?? null;

  const matches = matchedEntries.map((entry, index) => {
    const alert: MatchEvent = {
      id: `alert-${Date.now()}-${index}`,
      alertStatus: "PENDING",
      note: entry.reasonSummary ?? null,
      createdAt: occurredAt,
      detection: {
        plate: input.plate,
        country: input.country ?? entry.countryOrRegion ?? "",
        make: input.make ?? entry.vehicleMake ?? "",
        model: input.model ?? entry.vehicleModel ?? "",
        color: input.color ?? entry.vehicleColor ?? "",
        category: input.category ?? "Vehicle",
        confidence: input.confidence ?? 0.92,
        occurredAt,
        snapshotUrl: null,
      },
      workstation: workstation ? { name: workstation.name, deviceId: workstation.deviceId } : null,
      hitlistEntry: {
        id: entry.id,
        plateOriginal: entry.plateOriginal,
        reasonSummary: entry.reasonSummary ?? null,
        priority: entry.priority ?? null,
        caseReference: entry.caseReference ?? null,
      },
    };

    store.alerts.unshift(alert);
    return {
      id: alert.id,
      alertStatus: alert.alertStatus,
      hitlistEntry: clone(alert.hitlistEntry!),
    };
  });

  notify();

  return {
    detection: {
      id: detectionId,
      plate: input.plate,
      country: input.country ?? null,
      make: input.make ?? null,
      model: input.model ?? null,
      color: input.color ?? null,
      category: input.category ?? null,
      confidence: input.confidence ?? null,
      occurredAt,
    },
    matches,
    isHit: matches.length > 0,
    matchCount: matches.length,
  };
}
