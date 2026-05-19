export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,hsl(233_77%_67%/0.10),transparent_30%)]"
      />
      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1240px] items-center px-6 py-10">
        {children}
      </main>
    </div>
  );
}
