export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-10 [padding-top:env(safe-area-inset-top)] [padding-bottom:env(safe-area-inset-bottom)]">
      <div className="w-full max-w-sm">{children}</div>
    </main>
  );
}
