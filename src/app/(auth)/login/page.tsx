import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ redirect?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const redirectPath = resolvedSearchParams?.redirect ?? "/dashboard";

  return <LoginForm redirectPath={redirectPath} />;
}
