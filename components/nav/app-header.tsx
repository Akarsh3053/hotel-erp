import { UserButton } from "@clerk/nextjs";

export function AppHeader({ switcher }: { switcher?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 [padding-top:env(safe-area-inset-top)]">
      <div className="mx-auto flex h-14 max-w-screen-sm items-center justify-between gap-3 px-4">
        {switcher ?? (
          <span className="truncate text-sm font-semibold leading-tight">
            Hotel ERP
          </span>
        )}
        <UserButton appearance={{ elements: { avatarBox: "size-9" } }} />
      </div>
    </header>
  );
}
