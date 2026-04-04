"use client";

import { useState } from "react";
import { auth } from "@/lib/auth-client";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Shield,
  Bell,
  Monitor,
  Moon,
  Lock,
  KeyRound,
  Mail,
  Save,
  Loader2,
  CheckCircle,
  Languages,
} from "lucide-react";

type SettingsTab = "profile" | "security" | "notifications" | "system";

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Toggle({
  enabled,
  onToggle,
  label,
}: {
  enabled: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between w-full py-3 gap-4">
      <Label className="text-sm text-foreground font-normal cursor-pointer">{label}</Label>
      <Switch checked={enabled} onCheckedChange={() => onToggle()} />
    </div>
  );
}

function InputField({
  id,
  label,
  icon: Icon,
  ...props
}: {
  id: string;
  label: string;
  icon: typeof Mail;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <Label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5"
      >
        <Icon className="h-3 w-3" /> {label}
      </Label>
      <Input
        id={id}
        className="bg-input border-border placeholder:text-muted-foreground"
        {...props}
      />
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = auth.useSession();
  const { dictionary, language, setLanguage } = useLanguage();
  const copy = dictionary.settings;

  const tabs: { value: SettingsTab; label: string; icon: typeof User }[] = [
    { value: "profile", label: copy.profile, icon: User },
    { value: "security", label: copy.security, icon: Shield },
    { value: "notifications", label: copy.notifications, icon: Bell },
    { value: "system", label: copy.system, icon: Monitor },
  ];

  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(session?.user?.name ?? "");
  const [email] = useState(session?.user?.email ?? "");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [notifyAlerts, setNotifyAlerts] = useState(true);
  const [notifyDeviceOffline, setNotifyDeviceOffline] = useState(true);
  const [notifyNewVersion, setNotifyNewVersion] = useState(false);
  const [notifySounds, setNotifySounds] = useState(true);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await auth.updateUser({ name });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // auth client surfaces errors
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) return;
    setSaving(true);
    try {
      await auth.changePassword({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      // auth client surfaces errors
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{copy.title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {copy.subtitle}
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as SettingsTab)}>
        <TabsList className="flex gap-2 flex-wrap bg-transparent p-0 h-auto">
          {tabs.map((t) => {
            const TabIcon = t.icon;
            return (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  "glass glass-hover text-muted-foreground hover:text-foreground",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none",
                )}
              >
                <TabIcon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {saved && (
          <div className="glass rounded-xl p-4 border border-success/30 bg-success/5 flex items-center gap-3 mt-6">
            <CheckCircle className="h-4 w-4 text-success" />
            <p className="text-sm text-success">{copy.saved}</p>
          </div>
        )}

        <TabsContent value="profile" className="mt-6">
          <SettingsCard
            title={copy.profileInfo}
            description={copy.profileInfoDesc}
          >
            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <InputField
                id="profile-name"
                label={copy.displayName}
                icon={User}
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <InputField
                id="profile-email"
                label={copy.emailAddress}
                icon={Mail}
                type="email"
                value={email}
                disabled
              />
              <p className="text-xs text-muted-foreground">
                {copy.emailHelp}
              </p>
              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {dictionary.common.saveChanges}
                </Button>
              </div>
            </form>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <div className="space-y-4">
            <SettingsCard
              title={copy.changePassword}
              description={copy.changePasswordDesc}
            >
              <form
                onSubmit={handleChangePassword}
                className="space-y-4 max-w-lg"
              >
                <InputField
                  id="current-pw"
                  label={copy.currentPassword}
                  icon={Lock}
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <InputField
                  id="new-pw"
                  label={copy.newPassword}
                  icon={KeyRound}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
                <InputField
                  id="confirm-pw"
                  label={copy.confirmPassword}
                  icon={KeyRound}
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
                {newPassword &&
                  confirmPassword &&
                  newPassword !== confirmPassword && (
                    <p className="text-xs text-destructive">
                      {copy.passwordsMismatch}
                    </p>
                  )}
                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      saving ||
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword
                    }
                    className="flex items-center gap-2"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    {copy.updatePassword}
                  </Button>
                </div>
              </form>
            </SettingsCard>

            <SettingsCard title={copy.sessionInfo}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{copy.signedInAs}</span>
                  <span className="text-foreground font-medium force-ltr">{email}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{copy.role}</span>
                  <span className="text-foreground font-medium">{copy.operator}</span>
                </div>
              </div>
            </SettingsCard>
          </div>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <SettingsCard
            title={copy.notificationPreferences}
            description={copy.notificationDesc}
          >
            <div className="max-w-lg divide-y divide-border">
              <Toggle
                enabled={notifyAlerts}
                onToggle={() => setNotifyAlerts(!notifyAlerts)}
                label={copy.matchAlertNotifications}
              />
              <Toggle
                enabled={notifyDeviceOffline}
                onToggle={() => setNotifyDeviceOffline(!notifyDeviceOffline)}
                label={copy.deviceOfflineAlerts}
              />
              <Toggle
                enabled={notifyNewVersion}
                onToggle={() => setNotifyNewVersion(!notifyNewVersion)}
                label={copy.hitlistVersionUpdates}
              />
              <Toggle
                enabled={notifySounds}
                onToggle={() => setNotifySounds(!notifySounds)}
                label={copy.soundEffects}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              {copy.notificationHelp}
            </p>
          </SettingsCard>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
          <div className="space-y-4">
            <SettingsCard title={copy.systemInfo}>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{copy.platform}</span>
                  <span className="text-foreground font-mono text-xs force-ltr">
                    {dictionary.appName} v1.0
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{copy.dataSource}</span>
                  <span className="text-foreground font-mono text-xs">
                    {copy.mockStore}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">{copy.frontend}</span>
                  <span className="text-foreground font-mono text-xs force-ltr">
                    Next.js + Tailwind
                  </span>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title={copy.appearance}
              description={copy.appearanceDesc}
            >
              <div className="max-w-lg space-y-3">
                <div className="flex items-center justify-between py-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Moon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">{dictionary.common.darkMode}</span>
                  </div>
                  <Badge variant="secondary">{dictionary.common.alwaysOn}</Badge>
                </div>
              </div>
            </SettingsCard>

            <SettingsCard
              title={copy.languageAndRegion}
              description={copy.languageDesc}
            >
              <div className="max-w-lg space-y-4">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Languages className="h-3 w-3" />
                    {dictionary.common.language}
                  </Label>
                  <Select value={language} onValueChange={(value) => setLanguage(value as "en" | "ar")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">{dictionary.common.english}</SelectItem>
                      <SelectItem value="ar">{dictionary.common.arabic}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-xs text-muted-foreground">
                  {copy.languageHelp}
                </p>
              </div>
            </SettingsCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
