export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: [
            "radial-gradient(circle at 6% -8%, hsl(var(--auth-glow-1) / 0.18), transparent 38%)",
            "radial-gradient(circle at 96% 102%, hsl(var(--auth-glow-2) / 0.12), transparent 42%)",
            "radial-gradient(circle at 50% 50%, hsl(var(--auth-glow-3) / 0.30), transparent 70%)",
          ].join(", "),
        }}
      />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1320px] items-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
