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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Building2, Shield, Palette, Users, Mail, Phone, MapPin, Globe, Camera, Database, Check, AlertCircle, Sun, Zap, Factory, Edit, Trash2, Plus, GitBranch, RotateCcw, Layout } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useAppData } from "@/contexts/AppDataContext";
import type { SolarPackagePreset, SettingsTeamMember } from "@/types/project";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";
import { DesignSystem } from "@/pages/DesignSystem";

const LS_PROFILE = "mss.settings.profile";
const LS_COMPANY = "mss.settings.company";
const LS_THEME = "mss.settings.theme";
const LS_ACCENT = "mss.settings.accent";
const LS_2FA = "mss.settings.2fa";

const ACCENT_COLORS = [
  { label: "Blue", cls: "bg-blue-500", value: "blue" },
  { label: "Green", cls: "bg-green-600", value: "green" },
  { label: "Purple", cls: "bg-purple-500", value: "purple" },
  { label: "Amber", cls: "bg-amber-500", value: "amber" },
  { label: "Red", cls: "bg-red-500", value: "red" },
];

const Settings = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const {
    resetToDefaults,
    solarPackagePresets,
    replaceSolarPackagePresets,
    settingsTeamMembers,
    replaceSettingsTeamMembers,
  } = useAppData();
  const [activeTab, setActiveTab] = useState("profile");

  useEffect(() => {
    const tabParam = new URLSearchParams(location.search).get("tab");
    if (location.pathname.endsWith("/design-system") || tabParam === "design") {
      setActiveTab("design");
    }
  }, [location.pathname, location.search]);

  const handleTabChange = (v: string) => {
    setActiveTab(v);
    if (v === "design") {
      navigate("/settings/design-system", { replace: true });
    } else if (location.pathname.endsWith("/design-system")) {
      navigate("/settings", { replace: true });
    }
  };

  // Profile form state (I1)
  const [profileFirstName, setProfileFirstName] = useState(() => JSON.parse(localStorage.getItem(LS_PROFILE) || '{}').firstName || "");
  const [profileLastName, setProfileLastName] = useState(() => JSON.parse(localStorage.getItem(LS_PROFILE) || '{}').lastName || "");
  const [profileEmail, setProfileEmail] = useState(() => JSON.parse(localStorage.getItem(LS_PROFILE) || '{}').email || "");
  const [profilePhone, setProfilePhone] = useState(() => JSON.parse(localStorage.getItem(LS_PROFILE) || '{}').phone || "");
  const [profileRole, setProfileRole] = useState(() => JSON.parse(localStorage.getItem(LS_PROFILE) || '{}').role || "");

  // Company form state (I2)
  const [companyName, setCompanyName] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').companyName || "");
  const [companyGst, setCompanyGst] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').gstNumber || "");
  const [companyPan, setCompanyPan] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').panNumber || "");
  const [companyAddress, setCompanyAddress] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').address || "");
  const [companyWebsite, setCompanyWebsite] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').website || "");
  const [companyIndustry, setCompanyIndustry] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').industry || "construction");
  const [companyState, setCompanyState] = useState(() => JSON.parse(localStorage.getItem(LS_COMPANY) || '{}').companyState || "08");

  // Theme state (I3)
  const [selectedTheme, setSelectedTheme] = useState(() => localStorage.getItem(LS_THEME) || "dark");

  // Accent color state (I4)
  const [selectedAccent, setSelectedAccent] = useState(() => localStorage.getItem(LS_ACCENT) || "blue");

  // Password form (I5)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 2FA state (I6)
  const [twoFAEnabled, setTwoFAEnabled] = useState(() => localStorage.getItem(LS_2FA) === "true");

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
    localStorage.setItem(LS_THEME, selectedTheme);
  }, [selectedTheme]);

  const handleSaveProfile = () => {
    localStorage.setItem(LS_PROFILE, JSON.stringify({ firstName: profileFirstName, lastName: profileLastName, email: profileEmail, phone: profilePhone, role: profileRole }));
    toast({ title: "Profile saved", description: "Your profile has been updated." });
  };

  const handleSaveCompany = () => {
    localStorage.setItem(LS_COMPANY, JSON.stringify({ companyName, gstNumber: companyGst, panNumber: companyPan, address: companyAddress, website: companyWebsite, industry: companyIndustry, companyState }));
    toast({ title: "Company info saved", description: "Company details have been updated." });
  };

  const handleUpdatePassword = () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast({ title: "Password mismatch", description: "New password and confirm password do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Too short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    toast({ title: "Password updated", description: "Your password has been changed successfully." });
  };

  const handleToggle2FA = () => {
    const next = !twoFAEnabled;
    setTwoFAEnabled(next);
    localStorage.setItem(LS_2FA, String(next));
    toast({ title: next ? "2FA Enabled" : "2FA Disabled", description: next ? "Two-factor authentication is now active." : "Two-factor authentication has been disabled." });
  };
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleChangeConfirmOpen, setIsRoleChangeConfirmOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{memberId: number; currentRole: string; newRole: string} | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<SolarPackagePreset | null>(null);
  const [presetForm, setPresetForm] = useState({
    name: "",
    category: "residential" as 'residential' | 'commercial' | 'industrial',
    capacityKW: 0,
    panelBrand: "",
    panelWattage: 0,
    panelCount: 0,
    inverterBrand: "",
    inverterCapacity: "",
    structureType: "",
    estimatedCost: 0,
  });

  const handleAddPreset = (category: 'residential' | 'commercial' | 'industrial') => {
    setEditingPreset(null);
    setPresetForm({
      name: "",
      category,
      capacityKW: 0,
      panelBrand: "",
      panelWattage: 0,
      panelCount: 0,
      inverterBrand: "",
      inverterCapacity: "",
      structureType: "",
      estimatedCost: 0,
    });
    setIsPresetModalOpen(true);
  };

  const handleEditPreset = (preset: SolarPackagePreset) => {
    setEditingPreset(preset);
    setPresetForm({ ...preset });
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = () => {
    if (editingPreset) {
      replaceSolarPackagePresets(
        solarPackagePresets.map((p) =>
          p.id === editingPreset.id ? { ...(presetForm as SolarPackagePreset), id: editingPreset.id } : p,
        ),
      );
      toast({ title: "Preset Updated", description: `"${presetForm.name}" has been updated` });
    } else {
      const newPreset = { ...(presetForm as SolarPackagePreset), id: `preset-${Date.now()}` };
      replaceSolarPackagePresets([newPreset, ...solarPackagePresets]);
      toast({ title: "Preset Added", description: `"${presetForm.name}" has been created` });
    }
    setIsPresetModalOpen(false);
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    replaceSolarPackagePresets(solarPackagePresets.filter((p) => p.id !== presetId));
    toast({ title: "Preset Deleted", description: `"${presetName}" has been removed` });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential': return <Sun className="h-5 w-5 text-amber-500" />;
      case 'commercial': return <Zap className="h-5 w-5 text-primary" />;
      case 'industrial': return <Factory className="h-5 w-5 text-primary" />;
      default: return <Sun className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

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
      toast({
        title: "Role Updated",
        description: `Role has been changed to ${pendingRoleChange.newRole}`,
      });
    }
    setIsRoleChangeConfirmOpen(false);
    setPendingRoleChange(null);
  };

  const handleInviteMember = () => {
    if (inviteEmail && inviteRole) {
      const newMember: SettingsTeamMember = {
        id: Date.now(),
        name: inviteEmail.split("@")[0],
        email: inviteEmail,
        role: inviteRole,
        status: "Pending",
      };
      replaceSettingsTeamMembers([...settingsTeamMembers, newMember]);
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`,
      });
      setInviteEmail("");
      setInviteRole("");
      setIsInviteModalOpen(false);
    }
  };

  const handleRemoveMember = (memberId: number) => {
    const member = settingsTeamMembers.find((m) => m.id === memberId);
    if (member?.role === "Admin") return;
    replaceSettingsTeamMembers(settingsTeamMembers.filter((m) => m.id !== memberId));
    toast({
      title: "Member Removed",
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
              { label: "Presets", value: solarPackagePresets.length },
            ]}
          />
        }
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="flex gap-6">
        <TabsList className="flex-col h-auto bg-transparent p-0 justify-start w-[200px] shrink-0">
          <TabsTrigger value="profile" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="company" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="team" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Users className="h-4 w-4" />
            Team
          </TabsTrigger>
          <TabsTrigger value="appearance" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Palette className="h-4 w-4" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="security" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="design" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Layout className="h-4 w-4" />
            Design system
          </TabsTrigger>
          <TabsTrigger value="data" className="w-full justify-start gap-2 px-3 py-2 data-[state=active]:bg-muted">
            <Database className="h-4 w-4" />
            Data
          </TabsTrigger>
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
                    <Button size="icon" variant="outline" className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full">
                      <Camera className="h-4 w-4" />
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
                  <Button className="bg-primary" onClick={handleSaveProfile}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                  <Button className="bg-primary" onClick={handleSaveCompany}>Save Changes</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

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
                                <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500">Pending</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Select 
                            value={member.role.toLowerCase()}
                            onValueChange={(val) => handleRoleChange(member.id, val.charAt(0).toUpperCase() + val.slice(1))}
                          >
                            <SelectTrigger className="w-[120px] h-8 text-xs bg-muted/50 border-border">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="manager">Manager</SelectItem>
                              <SelectItem value="accountant">Accountant</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                            </SelectContent>
                          </Select>
                          {member.role === "Admin" ? (
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
                              className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
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
                        onClick={() => { setSelectedAccent(ac.value); localStorage.setItem(LS_ACCENT, ac.value); }}
                        className={`w-8 h-8 rounded-full ${ac.cls} ${selectedAccent === ac.value ? "ring-2 ring-offset-2 ring-offset-background ring-foreground" : ""}`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Security Settings</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Current Password</Label>
                  <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" className="bg-muted/50 border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Enter new password" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm new password" className="bg-muted/50 border-border" />
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

          <TabsContent value="design" className="mt-0 max-h-[calc(100vh-10rem)] min-h-0 overflow-y-auto pr-1">
            <DesignSystem embedded />
          </TabsContent>

          <TabsContent value="data" className="mt-0 space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-base font-medium">Prototype data</CardTitle>
                <CardDescription>
                  Restore the built-in demo dataset in memory. This does not clear your browser cache; it replaces app state for this session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Use this after errors or ad-hoc testing to get back to a known-good list of projects, quotations, and enquiries. You can also reach this from the error screen in Settings.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => {
                    toast({
                      title: "Reset all demo data?",
                      description: "In-memory data will be replaced. Unsaved work will be lost. This cannot be undone.",
                      variant: "destructive",
                      action: (
                        <ToastAction altText="Reset Data" onClick={() => {
                          resetToDefaults();
                          toast({ title: "Demo data reset", description: "Default data has been loaded." });
                        }}>
                          Reset Data
                        </ToastAction>
                      )
                    });
                  }}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset all demo data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Deleted AlertDialog */}

      {/* Invite Member Modal */}
      <Sheet open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
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
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Accountant">Accountant</SelectItem>
                  <SelectItem value="Supervisor">Supervisor</SelectItem>
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
        </SheetContent>
      </Sheet>

      {/* Role Change Confirmation Modal */}
      <Sheet open={isRoleChangeConfirmOpen} onOpenChange={setIsRoleChangeConfirmOpen}>
        <SheetContent className="max-w-sm overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>Confirm Role Change</SheetTitle>
          </SheetHeader>
          <div className="py-4">
            <div className="flex items-center gap-3 p-4 bg-amber-500/10 rounded-lg">
              <AlertCircle className="h-5 w-5 text-amber-500" />
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
        </SheetContent>
      </Sheet>

      {/* Add/Edit Preset Modal */}
      <Sheet open={isPresetModalOpen} onOpenChange={setIsPresetModalOpen}>
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] p-0 overflow-hidden overflow-y-auto custom-scrollbar">
          <SheetHeader>
            <SheetTitle>{editingPreset ? 'Edit Preset' : 'Add New Preset'}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Preset Name</Label>
              <Input 
                placeholder="e.g., Standard 5kW System" 
                value={presetForm.name}
                onChange={(e) => setPresetForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={presetForm.category} 
                  onValueChange={(v: 'residential' | 'commercial' | 'industrial') => setPresetForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Capacity (kW)</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 5" 
                  value={presetForm.capacityKW || ''}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, capacityKW: Number(e.target.value) }))}
                />
              </div>
            </div>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Panel Brand</Label>
                <Input 
                  placeholder="e.g., Waaree" 
                  value={presetForm.panelBrand}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, panelBrand: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Panel Wattage</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 540" 
                  value={presetForm.panelWattage || ''}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, panelWattage: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Number of Panels</Label>
                <Input 
                  type="number"
                  placeholder="e.g., 10" 
                  value={presetForm.panelCount || ''}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, panelCount: Number(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Inverter Brand</Label>
                <Input 
                  placeholder="e.g., Growatt" 
                  value={presetForm.inverterBrand}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, inverterBrand: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Inverter Capacity</Label>
                <Input 
                  placeholder="e.g., 5kW" 
                  value={presetForm.inverterCapacity}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, inverterCapacity: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Structure Type</Label>
                <Input 
                  placeholder="e.g., Elevated GI" 
                  value={presetForm.structureType}
                  onChange={(e) => setPresetForm(prev => ({ ...prev, structureType: e.target.value }))}
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Estimated Cost (₹)</Label>
              <Input 
                type="number"
                placeholder="e.g., 250000" 
                value={presetForm.estimatedCost || ''}
                onChange={(e) => setPresetForm(prev => ({ ...prev, estimatedCost: Number(e.target.value) }))}
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={() => setIsPresetModalOpen(false)}>Cancel</Button>
            <Button 
              className="bg-primary text-primary-foreground" 
              onClick={handleSavePreset}
              disabled={!presetForm.name || !presetForm.capacityKW}
            >
              {editingPreset ? 'Update Preset' : 'Add Preset'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </PageShell>
  );
};

export default Settings;