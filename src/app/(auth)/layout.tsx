export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(252_80%_64%/0.15),transparent_45%),radial-gradient(circle_at_80%_70%,hsl(178_100%_40%/0.12),transparent_50%)]"
      />
      <main className="relative z-10 w-full max-w-md px-6">{children}</main>
    </div>
  );
}
