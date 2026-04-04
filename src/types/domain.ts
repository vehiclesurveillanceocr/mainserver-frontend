export type DeviceStatus = "PENDING" | "ACTIVE" | "OFFLINE" | "DISABLED";
export type HitlistStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type MatchStatus = "PENDING" | "ACKNOWLEDGED" | "ESCALATED" | "FALSE_POSITIVE" | "RESOLVED";
export type UserRole = "admin" | "operator" | "scanner";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface SessionData {
  user: AppUser;
}

export interface Workstation {
  id: string;
  deviceId: string;
  name: string;
  description: string | null;
  deploymentProfile?: "fixed" | "vehicle";
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface Tablet {
  id: string;
  deviceId: string;
  name: string;
  description?: string | null;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
}

export type CameraStatus = "ONLINE" | "OFFLINE" | "DEGRADED" | "MAINTENANCE";
export type TabletNetworkStatus = "STRONG" | "FAIR" | "WEAK" | "DISCONNECTED";
export type GeoStatus = "LOCKED" | "SEARCHING" | "OFFLINE";

export interface DevicePairing {
  id: string;
  workstationId: string;
  tabletId: string;
  createdAt: string;
  unpairedAt: string | null;
}

export interface HitlistEntry {
  id: string;
  plateOriginal: string;
  plateNormalized: string;
  countryOrRegion?: string | null;
  priority?: string | null;
  status?: string;
  reasonSummary?: string | null;
  caseReference?: string | null;
  sourceAgency?: string | null;
  vehicleMake?: string | null;
  vehicleModel?: string | null;
  vehicleColor?: string | null;
  createdAt: string;
}

export interface HitlistVersion {
  id: string;
  versionNumber: number;
  note?: string | null;
  createdAt: string;
  entries: HitlistEntry[];
}

export interface Hitlist {
  id: string;
  name: string;
  description?: string | null;
  status: HitlistStatus;
  currentVersionNumber: number;
  versions: HitlistVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface MatchEvent {
  id: string;
  alertStatus: MatchStatus;
  note: string | null;
  createdAt: string;
  detection: {
    plate: string;
    country: string;
    make: string;
    model: string;
    color: string;
    category: string;
    confidence: number;
    occurredAt: string;
    snapshotUrl: string | null;
  } | null;
  workstation: {
    name: string;
    deviceId: string;
  } | null;
  hitlistEntry: {
    id?: string;
    plateOriginal: string;
    reasonSummary: string | null;
    priority: string | null;
    caseReference: string | null;
  } | null;
}

export interface SearchDetection {
  id: string;
  plate: string;
  timestamp: string;
  workstationName: string;
  workstationDeviceId: string;
  confidence: number;
  country: string;
  vehicle: string;
  source: "ALERT" | "SCAN";
  snapshotUrl: string | null;
}

export interface SystemHealthPoint {
  label: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  networkUplinkMbps: number;
  alertCount: number;
}

export interface WorkstationCamera {
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

export interface WorkstationMetrics {
  workstationId: string;
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  storageUsagePercent: number;
  uptimeHours: number;
  networkUplinkMbps: number;
  temperatureC: number;
  gpsStatus: GeoStatus;
  gnssStatus: GeoStatus;
  satelliteCount: number;
  lastFixAt: string | null;
}

export interface TabletRuntimeStatus {
  workstationId: string;
  tabletId: string | null;
  connectedToWorkstation: boolean;
  batteryLevel: number | null;
  memoryUsagePercent: number | null;
  signalStrength: TabletNetworkStatus;
  appVersion: string | null;
  lastHeartbeatAt: string | null;
}

export interface WorkstationDetail {
  workstation: Workstation;
  tablet: Tablet | null;
  metrics: WorkstationMetrics;
  tabletStatus: TabletRuntimeStatus;
  cameras: WorkstationCamera[];
}

export type UpdateRolloutStatus = "PENDING" | "RECEIVED" | "COMPLETED" | "FAILED";

export interface UpdateArtifact {
  id: string;
  version: string;
  fileName: string;
  fileSizeBytes: number;
  releaseNotes: string | null;
  packageType: ".deb";
  createdAt: string;
}

export interface WorkstationUpdateStatus {
  workstationId: string;
  status: UpdateRolloutStatus;
  assignedAt: string;
  receivedAt: string | null;
  completedAt: string | null;
  note: string | null;
}

export interface UpdateRollout {
  id: string;
  artifact: UpdateArtifact;
  targetProfile: "vehicle";
  createdAt: string;
  statuses: WorkstationUpdateStatus[];
}
