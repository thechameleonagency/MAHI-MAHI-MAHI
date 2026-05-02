import { useState } from "react";
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
import { User, Building2, Shield, Palette, Users, Mail, Phone, MapPin, Globe, Camera, Database, Check, AlertCircle, Sun, Zap, Factory, Edit, Trash2, Plus, GitBranch, RotateCcw } from "lucide-react";
import { ToastAction } from "@/components/ui/toast";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { StickyPageHeader } from "@/components/layout/StickyPageHeader";
import { PageShell } from "@/components/layout/PageShell";
import { InlineKpiStrip } from "@/components/layout/InlineKpiStrip";

const initialTeamMembers = [
  { id: 1, name: "John Doe", email: "john@company.com", role: "Admin", status: "Active" },
  { id: 2, name: "Rajesh Kumar", email: "rajesh@company.com", role: "Manager", status: "Active" },
  { id: 3, name: "Priya Sharma", email: "priya@company.com", role: "Accountant", status: "Active" },
  { id: 4, name: "Amit Singh", email: "amit@company.com", role: "Supervisor", status: "Pending" },
];

const Settings = () => {
  const { resetToDefaults } = useAppData();
  const [activeTab, setActiveTab] = useState("profile");

  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  
  // Modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isRoleChangeConfirmOpen, setIsRoleChangeConfirmOpen] = useState(false);
  const [pendingRoleChange, setPendingRoleChange] = useState<{memberId: number; currentRole: string; newRole: string} | null>(null);
  
  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");

  // Presets state
  interface QuotationPreset {
    id: string;
    name: string;
    category: 'residential' | 'commercial' | 'industrial';
    capacityKW: number;
    panelBrand: string;
    panelWattage: number;
    panelCount: number;
    inverterBrand: string;
    inverterCapacity: string;
    structureType: string;
    estimatedCost: number;
  }

  const [presets, setPresets] = useState<QuotationPreset[]>([
    {
      id: "res-3kw",
      name: "Standard 3kW System",
      category: "residential",
      capacityKW: 3,
      panelBrand: "Waaree",
      panelWattage: 540,
      panelCount: 6,
      inverterBrand: "Growatt",
      inverterCapacity: "3kW",
      structureType: "Elevated GI",
      estimatedCost: 185000,
    },
    {
      id: "com-20kw",
      name: "Commercial 20kW System",
      category: "commercial",
      capacityKW: 20,
      panelBrand: "Tata",
      panelWattage: 550,
      panelCount: 36,
      inverterBrand: "Sungrow",
      inverterCapacity: "20kW",
      structureType: "Flush Mount GI",
      estimatedCost: 1100000,
    },
    {
      id: "ind-100kw",
      name: "Industrial 100kW System",
      category: "industrial",
      capacityKW: 100,
      panelBrand: "Canadian Solar",
      panelWattage: 550,
      panelCount: 180,
      inverterBrand: "Sungrow",
      inverterCapacity: "100kW",
      structureType: "Ground Mount Aluminum",
      estimatedCost: 5500000,
    },
  ]);

  const [isPresetModalOpen, setIsPresetModalOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<QuotationPreset | null>(null);
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

  const handleEditPreset = (preset: QuotationPreset) => {
    setEditingPreset(preset);
    setPresetForm({ ...preset });
    setIsPresetModalOpen(true);
  };

  const handleSavePreset = () => {
    if (editingPreset) {
      setPresets(prev => prev.map(p => 
        p.id === editingPreset.id ? { ...presetForm, id: editingPreset.id } : p
      ));
      toast({ title: "Preset Updated", description: `"${presetForm.name}" has been updated` });
    } else {
      const newPreset = { ...presetForm, id: `preset-${Date.now()}` };
      setPresets(prev => [...prev, newPreset]);
      toast({ title: "Preset Added", description: `"${presetForm.name}" has been created` });
    }
    setIsPresetModalOpen(false);
  };

  const handleDeletePreset = (presetId: string, presetName: string) => {
    setPresets(prev => prev.filter(p => p.id !== presetId));
    toast({ title: "Preset Deleted", description: `"${presetName}" has been removed` });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'residential': return <Sun className="h-5 w-5 text-amber-500" />;
      case 'commercial': return <Zap className="h-5 w-5 text-blue-500" />;
      case 'industrial': return <Factory className="h-5 w-5 text-blue-500" />;
      default: return <Sun className="h-5 w-5" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  const handleRoleChange = (memberId: number, newRole: string) => {
    const member = teamMembers.find(m => m.id === memberId);
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
      setTeamMembers(prev => prev.map(m => 
        m.id === pendingRoleChange.memberId 
          ? { ...m, role: pendingRoleChange.newRole }
          : m
      ));
      toast({
        title: "Role Updated",
        description: `Role has been changed to ${pendingRoleChange.newRole}`
      });
    }
    setIsRoleChangeConfirmOpen(false);
    setPendingRoleChange(null);
  };

  const handleInviteMember = () => {
    if (inviteEmail && inviteRole) {
      const newMember = {
        id: Date.now(),
        name: inviteEmail.split('@')[0],
        email: inviteEmail,
        role: inviteRole,
        status: "Pending"
      };
      setTeamMembers(prev => [...prev, newMember]);
      toast({
        title: "Invitation Sent",
        description: `Invitation sent to ${inviteEmail}`
      });
      setInviteEmail("");
      setInviteRole("");
      setIsInviteModalOpen(false);
    }
  };

  const handleRemoveMember = (memberId: number) => {
    const member = teamMembers.find(m => m.id === memberId);
    if (member?.role === "Admin") return;
    setTeamMembers(prev => prev.filter(m => m.id !== memberId));
    toast({
      title: "Member Removed",
      description: "Team member has been removed"
    });
  };

  const teamActive = teamMembers.filter((m) => m.status === "Active").length;
  const settingsTabTitle: Record<string, string> = {
    profile: "Profile",
    company: "Company",
    team: "Team",
    appearance: "Appearance",
    security: "Security",
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
              { label: "Team", value: teamMembers.length },
              { label: "Active", value: teamActive },
              { label: "Presets", value: presets.length },
            ]}
          />
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex gap-6">
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
                    <Input id="firstName" defaultValue="John" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" defaultValue="Doe" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="email" defaultValue="john@company.com" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="phone" defaultValue="+91 98765 43210" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="role">Role</Label>
                    <Input id="role" defaultValue="Project Manager" className="bg-muted/50 border-border" />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-primary">Save Changes</Button>
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
                    <Input id="companyName" defaultValue="BuildPro Construction Pvt Ltd" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gst">GST Number</Label>
                    <Input id="gst" defaultValue="27AABCU9603R1ZM" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pan">PAN Number</Label>
                    <Input id="pan" defaultValue="AABCU9603R" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="address" defaultValue="123 Business Park, Andheri East, Mumbai - 400069" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input id="website" defaultValue="www.buildpro.com" className="pl-9 bg-muted/50 border-border" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Select defaultValue="construction">
                      <SelectTrigger className="bg-muted/50 border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construction">Construction</SelectItem>
                        <SelectItem value="infrastructure">Infrastructure</SelectItem>
                        <SelectItem value="realestate">Real Estate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button className="bg-primary">Save Changes</Button>
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
                    {teamMembers.map((member) => (
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
                    <Button variant="outline" className="flex-1 h-20 flex-col gap-2 border-primary">
                      <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-slate-700" />
                      <span className="text-xs">Dark</span>
                    </Button>
                    <Button variant="outline" className="flex-1 h-20 flex-col gap-2">
                      <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200" />
                      <span className="text-xs">Light</span>
                    </Button>
                    <Button variant="outline" className="flex-1 h-20 flex-col gap-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-slate-900 border-2 border-slate-400" />
                      <span className="text-xs">System</span>
                    </Button>
                  </div>
                </div>

                <Separator />

                <div className="space-y-3">
                  <Label>Accent Color</Label>
                  <div className="flex gap-3">
                    {["bg-blue-500", "bg-blue-500", "bg-purple-500", "bg-amber-500", "bg-red-500"].map((color, idx) => (
                      <button key={idx} className={`w-8 h-8 rounded-full ${color} ${idx === 0 ? "ring-2 ring-offset-2 ring-offset-background ring-blue-500" : ""}`} />
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
                  <Input type="password" placeholder="Enter current password" className="bg-muted/50 border-border" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" placeholder="Enter new password" className="bg-muted/50 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm Password</Label>
                    <Input type="password" placeholder="Confirm new password" className="bg-muted/50 border-border" />
                  </div>
                </div>
                <Button className="bg-primary">Update Password</Button>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Button variant="outline" size="sm">Enable</Button>
                </div>
              </CardContent>
            </Card>
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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
        <SheetContent className="w-full sm:max-w-4xl sm:w-[90vw] overflow-y-auto custom-scrollbar">
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