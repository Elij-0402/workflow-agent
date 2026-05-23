export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex min-h-screen w-full max-w-[1180px] items-center px-6 py-12">
        {children}
      </main>
    </div>
  );
}
