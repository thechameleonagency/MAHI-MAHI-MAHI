import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AppSheetContent } from "@/components/shared/AppSheetLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Building2, Shield, Palette, Users, Mail, Phone, MapPin, Globe, Camera, Database, Check, AlertCircle, RotateCcw, Layout, Boxes, KeyRound } from "lucide-react";
import { MastersTab } from "@/components/settings/MastersTab";
import { RoleMatrixTab } from "@/components/settings/RoleMatrixTab";
import { QuotationStaticSectionsTab } from "@/components/settings/QuotationStaticSectionsTab";
import { useCan } from "@/hooks/useCan";
import { ToastAction } from "@/components/ui/toast";
import { useAppData } from "@/contexts/AppDataContext";
import type { SettingsTeamMember } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { InlineConfirmBanner } from "@/components/ui/InlineConfirmBanner";
import { DestructiveConfirmDialog } from "@/components/ui/DestructiveConfirmDialog";
import { ROLE_LABELS, USER_ROLES } from "@/domain/entities/identity";
import {
  SETTINGS_PASSWORD_CURRENT_HELP,
  SETTINGS_PASSWORD_SUCCESS_DESCRIPTION,
  validateSettingsPasswordUpdate,
} from "@/lib/settingsPasswordUpdate";
import {
  loadSettingsPageInitialState,
  saveSettingsAccent,
  saveSettingsCompany,
  saveSettingsProfile,
  saveSettingsTheme,
  saveSettingsTwoFa,
} from "@/lib/settingsStorage";

const ACCENT_COLORS = [
  { label: "Blue", cls: "bg-primary", value: "blue" },
  { label: "Green", cls: "bg-success", value: "green" },
  { label: "Purple", cls: "bg-accent", value: "purple" },
  { label: "Amber", cls: "bg-warning", value: "amber" },
  { label: "Red", cls: "bg-destructive", value: "red" },
];

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    resetToDefaults,
    loadBusinessSeed,
    settingsTeamMembers,
    replaceSettingsTeamMembers,
  } = useAppData();
  const canViewMasters = useCan("settingsMasters", "view");
  const canViewRoleMatrix = useCan("settingsRoleMatrix", "view");
  const canViewCompany = useCan("settingsCompany", "view");
  const canViewTeam = useCan("settingsTeam", "view");
  const canViewTheme = useCan("settingsTheme", "view");
  const canViewSecurity = useCan("settingsSecurity", "view");
  const canViewData = useCan("settingsData", "view");
  const canResetPrototype = useCan("resetPrototype", "create");
  const [activeTab, setActiveTab] = useState("profile");
  const [lastConfirm, setLastConfirm] = useState<{ variant: "success" | "warning" | "error"; title: string; description?: string } | null>(null);
  const [isResetDataConfirmOpen, setIsResetDataConfirmOpen] = useState(false);
  const [isLoadSeedConfirmOpen, setIsLoadSeedConfirmOpen] = useState(false);
  const [seedProfile, setSeedProfile] = useState<"full" | "smoke">("full");

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (tabParam === "design" && canViewTheme) {
      navigate("/settings/design-system", { replace: true });
      return;
    }
    if (tabParam === "data" && canViewData) {
      setActiveTab("data");
    }
  }, [location.search, canViewTheme, canViewData, navigate]);

  useEffect(() => {
    const restricted: Record<string, boolean> = {
      company: !canViewCompany,
      team: !canViewTeam,
      appearance: !canViewTheme,
      security: !canViewSecurity,
      design: !canViewTheme,
      data: !canViewData,
      masters: !canViewMasters,
      roles: !canViewRoleMatrix,
      "quotation-sections": !canViewMasters,
    };
    if (restricted[activeTab]) {
      setActiveTab("profile");
    }
  }, [
    activeTab,
    canViewCompany,
    canViewTeam,
    canViewTheme,
    canViewSecurity,
    canViewData,
    canViewMasters,
    canViewRoleMatrix,
  ]);

  const handleTabChange = (v: string) => {
    if (v === "design") {
      navigate("/settings/design-system", { replace: true });
      return;
    }
    setActiveTab(v);
  };

  // Single localStorage read per mount (Md28 — avoids 12× JSON.parse in useState initialisers)
  const [storedSettings] = useState(() => loadSettingsPageInitialState());

  // Profile form state (I1)
  const [profileFirstName, setProfileFirstName] = useState(storedSettings.profile.firstName);
  const [profileLastName, setProfileLastName] = useState(storedSettings.profile.lastName);
  const [profileEmail, setProfileEmail] = useState(storedSettings.profile.email);
  const [profilePhone, setProfilePhone] = useState(storedSettings.profile.phone);
  const [profileRole, setProfileRole] = useState(storedSettings.profile.role);

  // Company form state (I2)
  const [companyName, setCompanyName] = useState(storedSettings.company.companyName);
  const [companyGst, setCompanyGst] = useState(storedSettings.company.gstNumber);
  const [companyPan, setCompanyPan] = useState(storedSettings.company.panNumber);
  const [companyAddress, setCompanyAddress] = useState(storedSettings.company.address);
  const [companyWebsite, setCompanyWebsite] = useState(storedSettings.company.website);
  const [companyIndustry, setCompanyIndustry] = useState(storedSettings.company.industry);
  const [companyState, setCompanyState] = useState(storedSettings.company.companyState);

  // Theme state (I3)
  const [selectedTheme, setSelectedTheme] = useState(storedSettings.theme);

  // Accent color state (I4)
  const [selectedAccent, setSelectedAccent] = useState(storedSettings.accent);

  // Password form (I5)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state (I6)
  const [twoFAEnabled, setTwoFAEnabled] = useState(storedSettings.twoFAEnabled);

  // Apply theme on mount and change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    if (selectedTheme === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.add(prefersDark ? "dark" : "light");
    } else {
      root.classList.add(selectedTheme);
    }
    saveSettingsTheme(selectedTheme);
  }, [selectedTheme]);

  const handleSaveProfile = () => {
    saveSettingsProfile({
      firstName: profileFirstName,
      lastName: profileLastName,
      email: profileEmail,
      phone: profilePhone,
      role: profileRole,
    });
    setLastConfirm({ variant: "success", title: "Profile saved", description: "Your profile has been updated." });
  };

  const handleSaveCompany = () => {
    saveSettingsCompany({
      companyName,
      gstNumber: companyGst,
      panNumber: companyPan,
      address: companyAddress,
      website: companyWebsite,
      industry: companyIndustry,
      companyState,
    });
    setLastConfirm({ variant: "success", title: "Company info saved", description: "Company details have been updated." });
  };

  const handleUpdatePassword = () => {
    const result = validateSettingsPasswordUpdate({
      currentPassword,
      newPassword,
      confirmPassword,
    });
    if (!result.ok) {
      toast({ title: result.title, description: result.description, variant: "destructive" });
      return;
    }
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setLastConfirm({
      variant: "success",
      title: "Password updated",
      description: SETTINGS_PASSWORD_SUCCESS_DESCRIPTION,
    });
  };

  const handleToggle2FA = () => {
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    saveSettingsTwoFa(next);
    setLastConfirm({ variant: next ? "success" : "warning", title: next ? "2FA enabled" : "2FA disabled", description: next ? "Two-factor authentication is now active." : "Two-factor authentication has been disabled." });
  };
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleChangeConfirmOpen, setIsRoleChangeConfirmOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{memberId: number; currentRole: string; newRole: string} | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  // Solar package preset state & handlers removed (Task 5). Templates are now exactly 2 types
  // managed under Inventory → Templates: Quotation templates + Site Checklist (fixed-items) templates.

  const handleRoleChange = (memberId: number, newRole: string) => {
    const member = settingsTeamMembers.find((m) => m.id === memberId);
    if (member && member.role !== newRole) {
      setPendingRoleChange({
        memberId,
        currentRole: member.role,
        newRole
      });
      setIsRoleChangeConfirmOpen(true);
    }
  };

  const confirmRoleChange = () => {
    if (pendingRoleChange) {
      replaceSettingsTeamMembers(
        settingsTeamMembers.map((m) =>
          m.id === pendingRoleChange.memberId ? { ...m, role: pendingRoleChange.newRole } : m,
        ),
      );
      setLastConfirm({
        variant: "success",
        title: "Role updated",
        description: `Role has been changed to ${pendingRoleChange.newRole}`,
      });
    }
    setIsRoleChangeConfirmOpen(false);
    setPendingRoleChange(null);
  };

  const handleInviteMember = () => {
    if (inviteEmail && inviteRole) {
      const token = `inv-${crypto.randomUUID()}`;
      const inviteLink = `${window.location.origin}/invite/${token}`;
      const newMember: SettingsTeamMember = {
        id: `STM-${Date.now()}`,
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        status: "Pending",
        inviteToken: token,
        invitedAt: new Date().toISOString(),
      };
      replaceSettingsTeamMembers([...settingsTeamMembers, newMember]);
      setLastConfirm({
        variant: "success",
        title: "Invitation created",
        description: `Invite link copied to clipboard for ${inviteEmail}`,
      });
      void navigator.clipboard?.writeText(inviteLink);
      setInviteEmail("");
      setInviteRole("");
      setIsInviteModalOpen(false);
    }
  };

  const handleRemoveMember = (memberId: string) => {
    const member = settingsTeamMembers.find((m) => m.id === memberId);
    if (member?.role === "super_admin" || member?.role === "Admin") return;
    replaceSettingsTeamMembers(settingsTeamMembers.filter((m) => m.id !== memberId));
    setLastConfirm({
      variant: "warning",
      title: "Member removed",
      description: "Team member has been removed",
    });
  };

  const teamActive = settingsTeamMembers.filter((m) => m.status === "Active").length;
  const settingsTabTitle: Record<string, string> = {
    profile: "Profile",
    company: "Company",
    team: "Team",
    appearance: "Appearance",
    security: "Security",
    design: "Design system",
    data: "Data",
    masters: "Masters",
    roles: "Role Matrix",
  };

  return (
    <PageShell className="space-y-6">
      <StickyPageHeader
        breadcrumbs={[{ label: "Home", to: "/" }, { label: "Settings" }]}
        subRow={
          <InlineKpiStrip
            className="w-full flex-wrap justify-start"
            items={[
              { label: "View", value: settingsTabTitle[activeTab] ?? activeTab },
              { label: "Team", value: settingsTeamMembers.length },
              { label: "Active", value: teamActive },
            ]}
          />
        }
      />

      {lastConfirm && (
        <InlineConfirmBanner
          variant={lastConfirm.variant}
          title={lastConfirm.title}
          description={lastConfirm.description}
          onDismiss={() => setLastConfirm(null)}
        />
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex gap-6">
        <TabsList className="flex-col h-auto bg-transparent p-0 justify-start w-[200px] shrink-0">
          <TabsTrigger value="profile" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          {canViewCompany && (
            <TabsTrigger value="company" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Building2 className="h-4 w-4" />
              Company
            </TabsTrigger>
          )}
          {canViewTeam && (
            <TabsTrigger value="team" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Users className="h-4 w-4" />
              Team
            </TabsTrigger>
          )}
          {canViewTheme && (
            <TabsTrigger value="appearance" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Palette className="h-4 w-4" />
              Appearance
            </TabsTrigger>
          )}
          {canViewSecurity && (
            <TabsTrigger value="security" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Shield className="h-4 w-4" />
              Security
            </TabsTrigger>
          )}
          {canViewTheme && (
            <TabsTrigger value="design" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Layout className="h-4 w-4" />
              Design system
            </TabsTrigger>
          )}
          {canViewData && (
            <TabsTrigger value="data" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Database className="h-4 w-4" />
              Data
            </TabsTrigger>
          )}
          {canViewMasters && (
            <TabsTrigger value="masters" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Boxes className="h-4 w-4" />
              Masters
            </TabsTrigger>
          )}
          {canViewRoleMatrix && (
            <TabsTrigger value="roles" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <KeyRound className="h-4 w-4" />
              Role matrix
            </TabsTrigger>
          )}
          {canViewMasters && (
            <TabsTrigger value="quotation-sections" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
              <Layout className="h-4 w-4" />
              Quotation sections
            </TabsTrigger>
          )}
        </TabsList>

        <div className="flex-1">
          <TabsContent value="profile" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Profile Information</CardTitle>
                <CardDescription>Update your personal details and profile picture</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-6">
                  <div className="relative">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback className="text-xl bg-primary/10 text-primary">JD</AvatarFallback>
                    </Avatar>
                    <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full" aria-label="Change profile photo">
                      <Camera className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Profile Photo</h3>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG or GIF. Max size 2MB.</p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" value={profileFirstName} onChange={e => setProfileFirstName(e.target.value)} placeholder="First name" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" value={profileLastName} onChange={e => setProfileLastName(e.target.value)} placeholder="Last name" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} placeholder="Email address" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" value={profilePhone} onChange={e => setProfilePhone(e.target.value)} placeholder="+91 XXXXX XXXXX" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" value={profileRole} onChange={e => setProfileRole(e.target.value)} placeholder="Your role / designation" className="bg-muted/50 border-border" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-primary" onClick={handleSaveProfile}>Save</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {canViewCompany && (
          <TabsContent value="company" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Company Information</CardTitle>
                <CardDescription>Manage your company details and branding</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input id="companyName" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="Company name" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST Number</Label>
                    <Input id="gst" value={companyGst} onChange={e => setCompanyGst(e.target.value)} placeholder="GST number" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input id="pan" value={companyPan} onChange={e => setCompanyPan(e.target.value)} placeholder="PAN number" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="companyAddress">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="companyAddress" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)} placeholder="Company address" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="website" value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} placeholder="www.yourcompany.com" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select value={companyIndustry} onValueChange={setCompanyIndustry}>
                      <SelectTrigger className="bg-muted/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="realestate">Real Estate</SelectItem>
                        <SelectItem value="solar">Solar / Renewable Energy</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyState">GST State Code</Label>
                    <Input id="companyState" value={companyState} onChange={e => setCompanyState(e.target.value)} placeholder="e.g. 08" className="bg-muted/50 border-border" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-primary" onClick={handleSaveCompany}>Save</Button>
                </div>
              </CardContent>
            </Card>

            {/*
              Solar package quick-picks Card removed (Task 5). The app's template model is
              now exactly 2 types — Quotation templates + Site Checklist (fixed-items) templates,
              both managed under Inventory → Templates. No third "solar package preset" surface.
            */}
          </TabsContent>
          )}

          {canViewTeam && (
          <TabsContent value="team" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Team Members</CardTitle>
                    <CardDescription>Manage team access and roles</CardDescription>
                  </div>
                  <Button size="sm" className="bg-primary" onClick={() => setIsInviteModalOpen(true)}>
                    Invite Member
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <TooltipProvider>
                    {settingsTeamMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="bg-primary/10 text-primary text-sm">
                              {member.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-foreground">{member.name}</p>
                              {member.status === "Pending" && (
                                <Badge variant="outline" className="text-xs bg-warning/10 text-warning">Pending</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select 
                            value={member.role.toLowerCase()}
                            onValueChange={(val) => handleRoleChange(member.id, val)}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/50 border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {USER_ROLES.map((role) => (
                                <SelectItem key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {member.role === "super_admin" || member.role === "Admin" ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="text-muted-foreground cursor-not-allowed opacity-50"
                                  disabled
                                >
                                  Remove
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Admin users cannot be removed</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleRemoveMember(member.id)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {canViewTheme && (
          <TabsContent value="appearance" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Appearance</CardTitle>
                <CardDescription>Customize the look and feel</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <Label>Theme</Label>
                  <div className="flex gap-3">
                    {[
                      { value: "dark", label: "Dark", cls: "bg-slate-900 border-slate-700" },
                      { value: "light", label: "Light", cls: "bg-white border-slate-200" },
                      { value: "system", label: "System", cls: "bg-gradient-to-br from-white to-slate-900 border-slate-400" },
                    ].map(t => (
                      <Button
                        key={t.value}
                        variant="outline"
                        className={`flex-1 h-20 flex-col gap-2 ${selectedTheme === t.value ? "border-primary ring-1 ring-primary" : ""}`}
                        onClick={() => setSelectedTheme(t.value)}
                      >
                        <div className={`w-8 h-8 rounded-full border-2 ${t.cls}`} />
                        <span className="text-xs">{t.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Accent Color</Label>
                  <div className="flex gap-3">
                    {ACCENT_COLORS.map(ac => (
                      <button
                        key={ac.value}
                        title={ac.label}
                        onClick={() => { setSelectedAccent(ac.value); saveSettingsAccent(ac.value); }}
                        className={`w-8 h-8 rounded-full ${ac.cls} ${selectedAccent === ac.value ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {canViewSecurity && (
          <TabsContent value="security" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="settings-current-password">Current Password</Label>
                  <Input
                    id="settings-current-password"
                    type="password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="bg-muted/50 border-border"
                    aria-describedby="settings-current-password-help"
                  />
                  <p id="settings-current-password-help" className="text-xs text-muted-foreground">
                    {SETTINGS_PASSWORD_CURRENT_HELP}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input
                      type="password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="bg-muted/50 border-border"
                    />
                  </div>
                </div>
                <Button className="bg-primary" onClick={handleUpdatePassword}>Update Password</Button>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">{twoFAEnabled ? "Currently enabled — your account has extra protection." : "Add an extra layer of security"}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleToggle2FA}>{twoFAEnabled ? "Disable" : "Enable"}</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {canViewData && (
          <TabsContent value="data" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">App data</CardTitle>
                <CardDescription>
                  The app opens with a full business seed by default (4–5 months of solar EPC data). All roles see this data after sign-in. Clearing browser storage reloads the default seed automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use <strong>Reset to empty workspace</strong> to demo masters-only boot. Use <strong>Load business seed</strong> to rebuild the portfolio from scratch. See `SEEDING DATA.md`.
                </p>
                {canViewData && !canResetPrototype && (
                  <p className="text-sm text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-md px-3 py-2">
                    Load and reset require Super Admin. Log in as Rajesh Kulkarni (super_admin) from the login page.
                  </p>
                )}
                {canResetPrototype && (
                  <>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="seed-profile">Seed profile</Label>
                        <Select value={seedProfile} onValueChange={(v) => setSeedProfile(v as "full" | "smoke")}>
                          <SelectTrigger id="seed-profile" className="w-[180px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="full">Full (4–5 months)</SelectItem>
                            <SelectItem value="smoke">Smoke (CI ~30%)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        className="gap-2"
                        onClick={() => setIsLoadSeedConfirmOpen(true)}
                      >
                        <Database className="h-4 w-4" />
                        Load business seed
                      </Button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      className="gap-2"
                      onClick={() => window.open("/prototype-wipe.html", "_blank", "noopener,noreferrer")}
                    >
                      Open full storage wipe (localStorage)
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="gap-2"
                      onClick={() => setIsResetDataConfirmOpen(true)}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset to empty workspace
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          )}

          {canViewMasters && (
            <TabsContent value="masters" className="mt-0 h-[calc(100vh-14rem)]">
              <MastersTab />
            </TabsContent>
          )}

          {canViewRoleMatrix && (
            <TabsContent value="roles" className="mt-0 h-[calc(100vh-14rem)] overflow-y-auto">
              <RoleMatrixTab />
            </TabsContent>
          )}

          {canViewMasters && (
            <TabsContent value="quotation-sections" className="mt-0 h-[calc(100vh-14rem)] overflow-y-auto">
              <QuotationStaticSectionsTab />
            </TabsContent>
          )}
        </div>
      </Tabs>

      {/* Deleted AlertDialog */}

      {/* Invite Member Modal */}
      <Sheet open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <AppSheetContent layout="scroll" size="xl">
          <SheetHeader>
            <SheetTitle>Invite Team Member</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input 
                type="email" 
                placeholder="colleague@company.com" 
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {USER_ROLES.map((role) => (
                    <SelectItem key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsInviteModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary text-primary-foreground" 
              onClick={handleInviteMember}
              disabled={!inviteEmail || !inviteRole}
            >
              Send Invite
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Role Change Confirmation Modal */}
      <Sheet open={isRoleChangeConfirmOpen} onOpenChange={setIsRoleChangeConfirmOpen}>
        <AppSheetContent layout="form" size="xs">
          <SheetHeader>
            <SheetTitle>Confirm Role Change</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-warning/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="text-sm">
                Are you sure you want to change the role from <strong>{pendingRoleChange?.currentRole}</strong> to <strong>{pendingRoleChange?.newRole}</strong>?
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsRoleChangeConfirmOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground" onClick={confirmRoleChange}>
              <Check className="h-4 w-4 mr-1" />
              Confirm
            </Button>
          </div>
        </AppSheetContent>
      </Sheet>

      {/* Solar package preset Sheet removed (Task 5). 2-template model lives under Inventory → Templates. */}

      <DestructiveConfirmDialog
        open={isResetDataConfirmOpen}
        onOpenChange={setIsResetDataConfirmOpen}
        title="Reset to empty workspace?"
        description="All localStorage app data will be deleted and the page will reload with zero business rows (masters reload from code). Unsaved work will be lost."
        typedConfirmation="RESET"
        confirmLabel="Reset data"
        onConfirm={() => {
          resetToDefaults();
          /* resetToDefaults reloads the page */
        }}
      />

      <DestructiveConfirmDialog
        open={isLoadSeedConfirmOpen}
        onOpenChange={setIsLoadSeedConfirmOpen}
        title="Load business seed?"
        description={`This wipes current data and loads the ${seedProfile === "full" ? "full 4–5 month" : "smoke CI"} business seed portfolio with linked projects, finance, inventory, and audit history. The page will reload.`}
        typedConfirmation="SEED"
        confirmLabel="Load seed"
        onConfirm={() => {
          loadBusinessSeed(seedProfile);
        }}
      />
    </PageShell>
  );
};

export default Settings;