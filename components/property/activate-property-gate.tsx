"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ROLE_LABELS, type Role } from "@/lib/auth/roles";

type Candidate = { orgId: string | null; name: string; role: Role };
type ValidCandidate = { orgId: string; name: string; role: Role };

/**
 * Shown when the user belongs to one or more properties but the session has no
 * active org yet (a fresh session right after sign-up or accepting an invite).
 * A single property auto-activates; multiple prompt for a choice. Activating
 * sets the Clerk active org and refreshes so the real app shell takes over.
 */
export function ActivatePropertyGate({
  properties,
}: {
  properties: Candidate[];
}) {
  const router = useRouter();
  const { setActive } = useClerk();
  const valid = properties.filter((p): p is ValidCandidate => Boolean(p.orgId));
  const [busy, setBusy] = useState(false);

  async function activate(orgId: string) {
    setBusy(true);
    try {
      await setActive({ organization: orgId });
      router.refresh();
    } catch {
      setBusy(false);
      toast.error("Couldn't open that property. Try again.");
    }
  }

  const only = valid.length === 1 ? valid[0].orgId : null;
  useEffect(() => {
    if (only) void activate(only);
    // Runs once for the single-property case; activate is stable enough here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [only]);

  if (valid.length <= 1) {
    return (
      <div className="mx-auto flex flex-col items-center gap-3 py-16 text-center text-muted-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <p className="text-sm">Opening your property…</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">
          Choose a property
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You have access to more than one. Pick where to work.
        </p>
      </div>
      <ul className="space-y-2">
        {valid.map((p) => (
          <li key={p.orgId}>
            <button
              type="button"
              disabled={busy}
              onClick={() => activate(p.orgId)}
              className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-foreground/10 transition-colors hover:bg-muted disabled:opacity-50"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">
                  {p.name}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {ROLE_LABELS[p.role]}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
