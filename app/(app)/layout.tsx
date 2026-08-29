import { AppHeader } from "@/components/nav/app-header";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SideNav } from "@/components/nav/side-nav";
import { ActivatePropertyGate } from "@/components/property/activate-property-gate";
import { PropertySwitcher } from "@/components/property/property-switcher";
import {
  getCurrentMembership,
  listMembershipsForCurrentUser,
} from "@/lib/auth/rbac";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [membership, memberships] = await Promise.all([
    getCurrentMembership(),
    listMembershipsForCurrentUser(),
  ]);

  // No active property resolved for this session.
  if (!membership) {
    // The user belongs to properties but none is active yet (fresh session
    // after sign-up / accepting an invite). Let them activate one before the
    // app pages render — those pages have no tenant to scope to otherwise.
    if (memberships.length > 0) {
      return (
        <div className="flex min-h-dvh flex-col">
          <AppHeader />
          <main className="mx-auto flex w-full max-w-screen-sm flex-1 items-center px-4 py-8">
            <ActivatePropertyGate
              properties={memberships.map((m) => ({
                orgId: m.property.clerkOrgId,
                name: m.property.name,
                role: m.role,
              }))}
            />
          </main>
        </div>
      );
    }

    // Brand-new user with no properties: minimal shell for onboarding
    // (home create-CTA and /properties/new both live under here).
    return (
      <div className="flex min-h-dvh flex-col">
        <AppHeader />
        <main className="mx-auto w-full max-w-screen-sm flex-1 px-4 pb-12 pt-4">
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards">
            {children}
          </div>
        </main>
      </div>
    );
  }

  const { role, property } = membership;
  const switchable = memberships
    .filter((m) => m.property.clerkOrgId)
    .map((m) => ({
      orgId: m.property.clerkOrgId as string,
      name: m.property.name,
      role: m.role,
    }));

  return (
    <div className="flex min-h-dvh flex-col">
      <AppHeader
        switcher={
          <PropertySwitcher
            activeOrgId={property.clerkOrgId}
            activeName={property.name}
            activeRole={role}
            properties={switchable}
          />
        }
      />
      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-64 shrink-0 overflow-y-auto border-r border-border bg-card lg:block">
          <SideNav role={role} />
        </aside>

        {/* Main Content Area */}
        <main className="w-full flex-1 px-4 py-4 pb-24 lg:px-8 lg:pb-8">
          <div className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-backwards">
            {children}
          </div>
        </main>
      </div>
      <BottomNav role={role} className="lg:hidden" />
    </div>
  );
}
