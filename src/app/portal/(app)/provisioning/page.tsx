"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Cpu,
  Eye,
  HardDrive,
  MemoryStick,
  MonitorSmartphone,
  RefreshCw,
  ShieldPlus,
  Waypoints,
} from "lucide-react";

import { useLanguage } from "@/components/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type ProvisioningStage =
  | "PENDING_APPROVAL"
  | "CERT_ISSUING"
  | "CERT_ISSUED"
  | "MTLS_CONFIGURED"
  | "ACTIVE";

type ProvisioningRecord = {
  id: string;
  workstationName: string;
  vehicleLabel: string;
  macAddress: string;
  ipAddress: string;
  requestedAt: string;
  approvedAt: string | null;
  certificateIssuedAt: string | null;
  mtlsConfiguredAt: string | null;
  lastHeartbeatAt: string;
  requestedByHost: string;
  region: string;
  stage: ProvisioningStage;
  serverAction: string;
  expectedSignal: string;
  notes: string;
  certificateProfile: string;
  cpuModel: string;
  ram: string;
  storage: string;
  osVersion: string;
  serialNumber: string;
  motherboard: string;
};

const INITIAL_RECORDS: ProvisioningRecord[] = [
  {
    id: "WS-241",
    workstationName: "Falcon Gate 01",
    vehicleLabel: "Dubai Patrol SUV 14",
    macAddress: "40:7D:0F:21:8A:11",
    ipAddress: "10.42.18.24",
    requestedAt: "2026-04-13T08:35:00.000Z",
    approvedAt: null,
    certificateIssuedAt: null,
    mtlsConfiguredAt: null,
    lastHeartbeatAt: "2026-04-13T08:36:12.000Z",
    requestedByHost: "falcon-gate-01.local",
    region: "Dubai Operations Yard",
    stage: "PENDING_APPROVAL",
    serverAction: "Await operator approval before issuing the signed workstation certificate.",
    expectedSignal: "HTTPS approval request received with installation manifest and hardware fingerprint.",
    notes: "Fresh workstation replacement for vehicle retrofit batch A.",
    certificateProfile: "vehicle-edge-standard",
    cpuModel: "Intel Core i7-12700T",
    ram: "32 GB DDR4",
    storage: "1 TB NVMe SSD",
    osVersion: "Ubuntu 24.04 LTS",
    serialNumber: "FG01-DXB-24013",
    motherboard: "Advantech UNO-2484G",
  },
  {
    id: "WS-242",
    workstationName: "Checkpoint South 02",
    vehicleLabel: "Fixed Site South Gate",
    macAddress: "40:7D:0F:21:8A:2C",
    ipAddress: "10.42.19.77",
    requestedAt: "2026-04-13T07:58:00.000Z",
    approvedAt: "2026-04-13T08:04:00.000Z",
    certificateIssuedAt: null,
    mtlsConfiguredAt: null,
    lastHeartbeatAt: "2026-04-13T08:41:55.000Z",
    requestedByHost: "checkpoint-s02.local",
    region: "Sharjah South Corridor",
    stage: "CERT_ISSUING",
    serverAction: "Certificate authority job is generating a signed certificate and bundle package.",
    expectedSignal: "Workstation waits for signed certificate package delivery after approval.",
    notes: "This site already passed hardware validation and is waiting on PKI issuance.",
    certificateProfile: "fixed-site-priority",
    cpuModel: "Intel Xeon E-2278GE",
    ram: "32 GB ECC",
    storage: "2 TB SSD RAID1",
    osVersion: "Ubuntu 24.04 LTS",
    serialNumber: "CS02-SHJ-18221",
    motherboard: "Supermicro X11SCL",
  },
  {
    id: "WS-243",
    workstationName: "Transit Van 09",
    vehicleLabel: "Transit Inspection Unit 09",
    macAddress: "40:7D:0F:21:8A:44",
    ipAddress: "10.42.22.13",
    requestedAt: "2026-04-13T06:42:00.000Z",
    approvedAt: "2026-04-13T06:49:00.000Z",
    certificateIssuedAt: "2026-04-13T07:01:00.000Z",
    mtlsConfiguredAt: null,
    lastHeartbeatAt: "2026-04-13T08:29:10.000Z",
    requestedByHost: "transit-09.local",
    region: "Abu Dhabi Mobile Fleet",
    stage: "CERT_ISSUED",
    serverAction: "Signed certificate was dispatched to the workstation and is waiting for local installation confirmation.",
    expectedSignal: "Workstation should install the certificate, restart the agent, and report mTLS setup status.",
    notes: "Certificate bundle delivered successfully, pending local secure store import.",
    certificateProfile: "vehicle-edge-standard",
    cpuModel: "Intel Core i5-12500TE",
    ram: "16 GB DDR4",
    storage: "512 GB NVMe SSD",
    osVersion: "Ubuntu 24.04 LTS",
    serialNumber: "TV09-AUH-20118",
    motherboard: "OnLogic Helix 310",
  },
  {
    id: "WS-244",
    workstationName: "Harbor Watch 03",
    vehicleLabel: "Port Security Tower 03",
    macAddress: "40:7D:0F:21:8A:58",
    ipAddress: "10.42.25.91",
    requestedAt: "2026-04-13T05:55:00.000Z",
    approvedAt: "2026-04-13T06:02:00.000Z",
    certificateIssuedAt: "2026-04-13T06:16:00.000Z",
    mtlsConfiguredAt: "2026-04-13T06:28:00.000Z",
    lastHeartbeatAt: "2026-04-13T08:44:12.000Z",
    requestedByHost: "harbor-watch-03.local",
    region: "Jebel Ali Port",
    stage: "MTLS_CONFIGURED",
    serverAction: "Secure channel established and workstation is now reporting successful local mTLS configuration.",
    expectedSignal: "Server expects authenticated heartbeat and service health payloads over mTLS.",
    notes: "Agent restarted successfully and has begun using the provisioned certificate.",
    certificateProfile: "fixed-site-priority",
    cpuModel: "Intel Xeon D-1718T",
    ram: "64 GB ECC",
    storage: "2 TB NVMe SSD",
    osVersion: "Ubuntu 24.04 LTS",
    serialNumber: "HW03-JAP-14409",
    motherboard: "Advantech MIC-770 V3",
  },
  {
    id: "WS-245",
    workstationName: "Rapid Response 17",
    vehicleLabel: "Police Interceptor 17",
    macAddress: "40:7D:0F:21:8A:6E",
    ipAddress: "10.42.29.16",
    requestedAt: "2026-04-13T04:48:00.000Z",
    approvedAt: "2026-04-13T04:54:00.000Z",
    certificateIssuedAt: "2026-04-13T05:06:00.000Z",
    mtlsConfiguredAt: "2026-04-13T05:13:00.000Z",
    lastHeartbeatAt: "2026-04-13T08:46:32.000Z",
    requestedByHost: "rapid-response-17.local",
    region: "Ajman Highway Patrol",
    stage: "ACTIVE",
    serverAction: "Provisioning completed. Device has already moved out of the queue.",
    expectedSignal: "All future telemetry and scan traffic should continue over the issued mTLS identity.",
    notes: "Healthy baseline device for comparison with new requests.",
    certificateProfile: "vehicle-edge-standard",
    cpuModel: "Intel Core i7-1265UE",
    ram: "16 GB LPDDR4x",
    storage: "512 GB NVMe SSD",
    osVersion: "Ubuntu 24.04 LTS",
    serialNumber: "RR17-AJM-11076",
    motherboard: "Axiomtek ICO300",
  },
];

export default function ProvisioningPage() {
  const { dictionary, isRTL, formatDateTime } = useLanguage();
  const copy = dictionary.provisioningPage;
  const common = dictionary.common;

  const [records, setRecords] = useState(INITIAL_RECORDS);
  const [selectedRecord, setSelectedRecord] = useState<ProvisioningRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const queueRecords = useMemo(
    () => records.filter((record) => record.stage !== "ACTIVE"),
    [records],
  );

  const stageMeta: Record<
    Exclude<ProvisioningStage, "ACTIVE">,
    {
      badge: "warning" | "default" | "success";
      label: string;
    }
  > = {
    PENDING_APPROVAL: { badge: "warning", label: copy.stagePending },
    CERT_ISSUING: { badge: "default", label: copy.stageIssuing },
    CERT_ISSUED: { badge: "default", label: copy.stageIssued },
    MTLS_CONFIGURED: { badge: "success", label: copy.stageConfigured },
  };

  const summary = useMemo(() => {
    return {
      total: queueRecords.length,
      pendingApproval: queueRecords.filter((item) => item.stage === "PENDING_APPROVAL").length,
      certInFlight: queueRecords.filter((item) => item.stage === "CERT_ISSUING" || item.stage === "CERT_ISSUED").length,
      mtlsReady: queueRecords.filter((item) => item.stage === "MTLS_CONFIGURED").length,
    };
  }, [queueRecords]);

  function refreshMockState() {
    setRefreshing(true);
    window.setTimeout(() => {
      setRecords([...INITIAL_RECORDS]);
      setSelectedRecord(null);
      setRefreshing(false);
    }, 500);
  }

  function approveRecord(id: string) {
    setRecords((current) =>
      current.map((record) =>
        record.id === id
          ? {
              ...record,
              stage: "CERT_ISSUING",
              approvedAt: new Date().toISOString(),
              serverAction: "Approval completed. The main server has queued PKI signing for this workstation certificate.",
              expectedSignal: "The workstation waits for automatic certificate delivery once the CA bundle is prepared.",
            }
          : record,
      ),
    );

    setSelectedRecord((current) =>
      current?.id === id
        ? {
            ...current,
            stage: "CERT_ISSUING",
            approvedAt: new Date().toISOString(),
            serverAction: "Approval completed. The main server has queued PKI signing for this workstation certificate.",
            expectedSignal: "The workstation waits for automatic certificate delivery once the CA bundle is prepared.",
          }
        : current,
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{copy.subtitle}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={refreshMockState}
          disabled={refreshing}
          className="glass glass-hover gap-2"
        >
          <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
          {common.refresh}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard label={copy.totalRequests} value={summary.total} tone="default" />
        <SummaryCard label={copy.awaitingApproval} value={summary.pendingApproval} tone="warning" />
        <SummaryCard label={copy.certInFlight} value={summary.certInFlight} tone="info" />
        <SummaryCard label={copy.mtlsReady} value={summary.mtlsReady} tone="success" />
      </div>

      <Card className="glass overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-foreground">{copy.queueTitle}</h2>
              <p className="text-xs text-muted-foreground mt-1">{copy.queueSubtitle}</p>
            </div>
            <p className="text-xs text-muted-foreground">{copy.refreshHint}</p>
          </div>

          {queueRecords.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/20 m-6 p-10 text-center">
              <p className="text-sm font-medium text-foreground">{copy.emptyTitle}</p>
              <p className="text-sm text-muted-foreground mt-1">{copy.emptyBody}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[940px]">
                <div className="grid grid-cols-[1.45fr_1fr_1.15fr_1fr_1fr_1fr] gap-4 px-6 py-4 text-[11px] uppercase tracking-[0.18em] text-muted-foreground border-b border-border">
                  <span>{copy.workstation}</span>
                  <span>{copy.macAddress}</span>
                  <span>{copy.location}</span>
                  <span>{copy.stage}</span>
                  <span>{copy.requestTime}</span>
                  <span className="text-right">{copy.actions}</span>
                </div>

                {queueRecords.map((record) => {
                  const meta = stageMeta[record.stage as Exclude<ProvisioningStage, "ACTIVE">];
                  const showApprove = record.stage === "PENDING_APPROVAL";

                  return (
                    <div
                      key={record.id}
                      className="grid grid-cols-[1.45fr_1fr_1.15fr_1fr_1fr_1fr] gap-4 px-6 py-5 border-b border-border/70 items-center last:border-b-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">{record.workstationName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{record.id} · {record.vehicleLabel}</p>
                      </div>
                      <p className="text-sm text-foreground force-ltr font-mono">{record.macAddress}</p>
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{record.region}</p>
                        <p className="text-xs text-muted-foreground mt-1 force-ltr truncate">{record.requestedByHost}</p>
                      </div>
                      <div>
                        <Badge variant={meta.badge === "warning" ? "warning" : meta.badge === "success" ? "success" : "secondary"}>
                          {meta.label}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm text-foreground">{formatDateTime(record.requestedAt)}</p>
                        <p className="text-xs text-muted-foreground mt-1 force-ltr">{record.ipAddress}</p>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        {showApprove && (
                          <Button type="button" size="sm" onClick={() => approveRecord(record.id)} className="gap-2">
                            <ShieldPlus className="h-4 w-4" />
                            {copy.approve}
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => setSelectedRecord(record)}
                          aria-label={copy.viewDetails}
                          className="glass glass-hover"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedRecord)} onOpenChange={(open) => !open && setSelectedRecord(null)}>
        {selectedRecord && (
          <DialogContent className="w-[min(92vw,36rem)] max-h-[85vh] p-0 overflow-hidden">
            <div className="shrink-0 p-5 border-b border-border bg-card/40">
              <DialogHeader>
                <DialogTitle>{copy.detailsTitle}</DialogTitle>
                <DialogDescription>
                  {selectedRecord.workstationName} · {selectedRecord.vehicleLabel}
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="max-h-[calc(85vh-88px)] overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <DetailCard label={copy.workstation} value={selectedRecord.id} mono />
                <DetailCard label={copy.macAddress} value={selectedRecord.macAddress} mono />
                <DetailCard label={copy.hostname} value={selectedRecord.requestedByHost} mono />
                <DetailCard label={copy.certificateProfile} value={selectedRecord.certificateProfile} mono />
              </div>

              <div className="rounded-2xl border border-border bg-card/25 p-4">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="text-sm font-semibold text-foreground">Hardware Details</h3>
                  {selectedRecord.stage !== "ACTIVE" && (
                    <Badge variant={stageMeta[selectedRecord.stage as Exclude<ProvisioningStage, "ACTIVE">].badge === "warning" ? "warning" : stageMeta[selectedRecord.stage as Exclude<ProvisioningStage, "ACTIVE">].badge === "success" ? "success" : "secondary"}>
                      {stageMeta[selectedRecord.stage as Exclude<ProvisioningStage, "ACTIVE">].label}
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <HardwareCard icon={Cpu} label="CPU" value={selectedRecord.cpuModel} />
                  <HardwareCard icon={MemoryStick} label="RAM" value={selectedRecord.ram} />
                  <HardwareCard icon={HardDrive} label="Storage" value={selectedRecord.storage} />
                  <HardwareCard icon={MonitorSmartphone} label="OS" value={selectedRecord.osVersion} />
                  <HardwareCard icon={Waypoints} label="Serial Number" value={selectedRecord.serialNumber} />
                  <HardwareCard icon={Waypoints} label="Motherboard" value={selectedRecord.motherboard} />
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-card/25 p-4">
                <h3 className="text-sm font-semibold text-foreground">{copy.payloadTitle}</h3>
                <div className="mt-3 space-y-2.5 text-sm text-muted-foreground">
                  <PayloadLine label="requested_at" value={selectedRecord.requestedAt} />
                  <PayloadLine label="approved_at" value={selectedRecord.approvedAt ?? "pending"} />
                  <PayloadLine label="certificate_issued_at" value={selectedRecord.certificateIssuedAt ?? "pending"} />
                  <PayloadLine label="mtls_configured_at" value={selectedRecord.mtlsConfiguredAt ?? "pending"} />
                  <PayloadLine label="ip_address" value={selectedRecord.ipAddress} />
                </div>
              </div>

              <DetailPanel title={copy.notes} body={selectedRecord.notes} />
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "default" | "warning" | "info" | "success";
}) {
  return (
    <Card className="glass glass-hover">
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-3 text-3xl font-semibold tabular-nums",
            tone === "warning" && "text-warning",
            tone === "info" && "text-accent",
            tone === "success" && "text-success",
            tone === "default" && "text-foreground",
          )}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

function DetailCard({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card/25 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn("mt-1.5 text-sm font-medium text-foreground", mono && "force-ltr font-mono text-[13px]")}>
        {value}
      </p>
    </div>
  );
}

function DetailPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/25 p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
    </div>
  );
}

function PayloadLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/55 px-3 py-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="force-ltr font-mono text-[12px] text-foreground break-all">{value}</span>
    </div>
  );
}

function HardwareCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Cpu;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-background/55 p-3">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-4 w-4" />
        <p className="text-xs uppercase tracking-[0.16em]">{label}</p>
      </div>
      <p className="mt-2 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
