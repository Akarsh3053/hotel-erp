export default function Loading() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="relative size-16">
        <div className="absolute inset-0 animate-spin rounded-full border-4 border-border border-t-primary"></div>
        <div className="absolute inset-3 animate-spin rounded-full border-4 border-border border-t-primary" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      </div>
    </div>
  );
}