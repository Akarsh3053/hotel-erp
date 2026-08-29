"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS, type Role } from "@/lib/auth/roles";
import {
  INVITABLE_ROLES,
  inviteStaffSchema,
  type InvitableRole,
} from "@/lib/validations/property";
import {
  inviteStaff,
  removeStaff,
  revokeInvitation,
} from "@/app/(app)/settings/actions";

export type StaffMember = {
  membershipId: string;
  role: Role;
  name: string | null;
  email: string | null;
  isSelf: boolean;
  isOwner: boolean;
};

export type PendingInvitation = {
  id: string;
  email: string;
  role: string;
};

type Confirm =
  | { kind: "remove"; id: string; label: string }
  | { kind: "revoke"; id: string; label: string }
  | null;

function initials(name: string | null, email: string | null): string {
  const src = (name ?? email ?? "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function roleLabel(role: string): string {
  return role in ROLE_LABELS ? ROLE_LABELS[role as Role] : "Member";
}

export function StaffManager({
  canManage,
  isOwner = false,
  members,
  invitations,
}: {
  canManage: boolean;
  isOwner?: boolean;
  members: StaffMember[];
  invitations: PendingInvitation[];
}) {
  const router = useRouter();

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitableRole>("receptionist");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);

  // Shared confirm dialog for remove / revoke
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [working, setWorking] = useState(false);

  async function submitInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError(null);
    const parsed = inviteStaffSchema.safeParse({ email, role });
    if (!parsed.success) {
      setInviteError(parsed.error.issues[0]?.message ?? "Check the details.");
      return;
    }
    setInviting(true);
    const result = await inviteStaff(parsed.data);
    setInviting(false);
    if (!result.ok) {
      setInviteError(result.error);
      return;
    }
    toast.success(`Invitation sent to ${parsed.data.email}`);
    setInviteOpen(false);
    setEmail("");
    setRole("receptionist");
    router.refresh();
  }

  async function runConfirm() {
    if (!confirm) return;
    setWorking(true);
    const result =
      confirm.kind === "remove"
        ? await removeStaff({ membershipId: confirm.id })
        : await revokeInvitation({ invitationId: confirm.id });
    setWorking(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(
      confirm.kind === "remove" ? "Member removed" : "Invitation revoked",
    );
    setConfirm(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">Team</h2>
        {isOwner ? (
          <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus data-icon="inline-start" />
                Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <form onSubmit={submitInvite}>
                <DialogHeader>
                  <DialogTitle>Invite a staff member</DialogTitle>
                  <DialogDescription>
                    They&apos;ll get an email invite. Their role applies once
                    they accept.
                  </DialogDescription>
                </DialogHeader>

                <div className="my-4 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-email">Email</Label>
                    <Input
                      id="invite-email"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invite-role">Role</Label>
                    <Select
                      value={role}
                      onValueChange={(v) => setRole(v as InvitableRole)}
                    >
                      <SelectTrigger id="invite-role" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVITABLE_ROLES.map((r) => (
                          <SelectItem key={r} value={r}>
                            {ROLE_LABELS[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {inviteError ? (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  ) : null}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={inviting}>
                    {inviting ? (
                      <>
                        <Loader2 className="animate-spin" data-icon="inline-start" />
                        Sending…
                      </>
                    ) : (
                      "Send invite"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        ) : null}
      </div>

      <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
        {members.map((m) => (
          <li key={m.membershipId} className="flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            >
              {initials(m.name, m.email)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.name ?? m.email ?? "Unknown"}
                {m.isSelf ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    (you)
                  </span>
                ) : null}
              </p>
              {m.name && m.email ? (
                <p className="truncate text-xs text-muted-foreground">
                  {m.email}
                </p>
              ) : null}
            </div>
            <Badge variant="secondary">{ROLE_LABELS[m.role]}</Badge>
            {canManage && !m.isOwner && !m.isSelf ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() =>
                  setConfirm({
                    kind: "remove",
                    id: m.membershipId,
                    label: m.name ?? m.email ?? "this member",
                  })
                }
              >
                Remove
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      {invitations.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            Pending invitations
          </h3>
          <ul className="divide-y divide-border rounded-xl ring-1 ring-foreground/10">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{inv.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Invited as {roleLabel(inv.role)}
                  </p>
                </div>
                <Badge variant="outline">Pending</Badge>
                {canManage ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() =>
                      setConfirm({
                        kind: "revoke",
                        id: inv.id,
                        label: inv.email,
                      })
                    }
                  >
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <Dialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open && !working) setConfirm(null);
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>
              {confirm?.kind === "remove"
                ? "Remove team member?"
                : "Revoke invitation?"}
            </DialogTitle>
            <DialogDescription>
              {confirm?.kind === "remove"
                ? `${confirm?.label} will lose access to this property.`
                : `The invitation to ${confirm?.label} will no longer be valid.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={working}
              onClick={() => setConfirm(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={working}
              onClick={runConfirm}
            >
              {working ? (
                <>
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                  Working…
                </>
              ) : confirm?.kind === "remove" ? (
                "Remove"
              ) : (
                "Revoke"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
