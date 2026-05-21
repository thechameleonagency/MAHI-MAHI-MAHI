import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppData } from "@/contexts/AppDataContext";
import { useAppSession } from "@/app/providers/AppSessionProvider";
import { normalizeTeamMemberStatus } from "@/lib/seedSessionBootstrap";
import { persistInvitePassword } from "@/lib/sessionActorStorage";
import { toast } from "@/hooks/use-toast";
export default function InviteAccept() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { settingsTeamMembers, replaceSettingsTeamMembers } = useAppData();
  const { login } = useAppSession();

  const member = useMemo(
    () => settingsTeamMembers.find((m) => m.inviteToken === token),
    [settingsTeamMembers, token],
  );

  const [name, setName] = useState(member?.name ?? "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!token || !member) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invalid invitation</CardTitle>
            <CardDescription>This invite link is expired or was not found.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (normalizeTeamMemberStatus(member.status) === "Active") {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Already active</CardTitle>
            <CardDescription>This account is already active. Sign in from the login page.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")}>Go to login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    const updated = settingsTeamMembers.map((m) =>
      m.inviteToken === token
        ? {
            ...m,
            name: name.trim() || m.name,
            status: "Active",
            activatedAt: new Date().toISOString(),
            inviteToken: undefined,
          }
        : m,
    );
    replaceSettingsTeamMembers(updated);
    persistInvitePassword(member.email, password);

    const activated = updated.find((m) => m.email === member.email);
    const result = login(member.email, password, updated);
    if (!result.ok) {
      toast({ title: "Account activated", description: "Sign in with your new password.", variant: "default" });
      navigate("/login");
      return;
    }
    toast({
      title: "Welcome",
      description: activated ? `${activated.name} is now active.` : "Invitation accepted.",
    });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border">
        <CardHeader>
          <CardTitle>Accept invitation</CardTitle>
          <CardDescription>
            Join MSS Solar as <strong>{member.role}</strong> — {member.email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAccept} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Display name</Label>
              <Input
                id="invite-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-password">Set password</Label>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-confirm">Confirm password</Label>
              <Input
                id="invite-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Passwords are stored locally in this browser only (prototype).
            </p>
            <Button type="submit" className="w-full">
              Activate account
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
