import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Sun } from "lucide-react";
import {
  DEMO_LOGIN_USERS,
  DEMO_PASSWORD,
  demoUsersByRole,
  type DemoLoginUser,
} from "@/domain/demoCredentials";
import { ROLE_LABELS, USER_ROLES, type UserRole } from "@/domain/entities/identity";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { useAppData } from "@/contexts/AppDataContext";
import { toast } from "@/hooks/use-toast";
import { MobileDemoPostureCard } from "@/components/demo/MobileDemoPostureCard";

const ROLE_ORDER: UserRole[] = [
  "super_admin",
  "admin",
  "ceo",
  "management",
  "salesperson",
  "installation_team",
];

function PersonaCard({
  user,
  selected,
  onSelect,
}: {
  user: DemoLoginUser;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-left rounded-lg border px-3 py-2 transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
      }`}
    >
      <p className="text-sm font-medium text-foreground">{user.name}</p>
      <p className="text-xs text-muted-foreground">{user.memberId}</p>
      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
    </button>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAppSession();
  const { settingsTeamMembers } = useAppData();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole>("super_admin");

  const from = (location.state as { from?: string } | null)?.from ?? "/";

  const usersForRole = useMemo(() => demoUsersByRole(activeRole), [activeRole]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, from, navigate]);

  if (isAuthenticated) {
    return null;
  }

  const selectPersona = (user: DemoLoginUser) => {
    setSelectedMemberId(user.memberId);
    setEmail(user.email);
    setPassword(DEMO_PASSWORD);
    setActiveRole(user.role);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = login(email, password, settingsTeamMembers);
    if (!result.ok) {
      const description =
        result.error?.includes("not active") || result.error?.includes("invitation")
          ? "This account is not active yet. Complete your invitation first."
          : "Invalid email or password.";
      toast({ title: "Sign in failed", description, variant: "destructive" });
      return;
    }
    toast({ title: "Signed in", description: `Welcome, ${email}` });
    navigate(from, { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center gap-6 p-4">
      <div className="w-full max-w-4xl grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card className="border-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sun className="h-6 w-6 text-primary" />
              <CardTitle>MSS Solar EPC</CardTitle>
            </div>
            <CardDescription>
              Demo login — select a persona or enter credentials. Password: <code className="text-xs">{DEMO_PASSWORD}</code>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {ROLE_ORDER.map((role) => (
                <Button
                  key={role}
                  type="button"
                  size="sm"
                  variant={activeRole === role ? "default" : "outline"}
                  onClick={() => setActiveRole(role)}
                >
                  {ROLE_LABELS[role]}
                </Button>
              ))}
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {usersForRole.map((user) => (
                <PersonaCard
                  key={user.memberId}
                  user={user}
                  selected={selectedMemberId === user.memberId}
                  onSelect={() => selectPersona(user)}
                />
              ))}
            </div>
            {activeRole === "installation_team" && (
              <p className="text-xs text-muted-foreground">
                Four installation team logins — use different personas to test team roster and field workflows.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base">Sign in</CardTitle>
            <CardDescription>Credentials prefilled when you pick a persona above.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@mss.solar"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full">
                Sign in
              </Button>
              <p className="text-xs text-muted-foreground">
                {DEMO_LOGIN_USERS.length} demo users. Business data loads automatically on first open (or after clearing storage). Password: {DEMO_PASSWORD}
              </p>
              <Badge variant="outline" className="text-xs">
                Local prototype — no server auth
              </Badge>
            </form>
          </CardContent>
        </Card>
      </div>
      <MobileDemoPostureCard variant="compact" className="w-full max-w-4xl border-primary/20" />
    </div>
  );
}
