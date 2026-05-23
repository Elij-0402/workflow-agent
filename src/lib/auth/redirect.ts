export function getSafeRedirectPath(formData: FormData) {
  const redirectPath = String(formData.get("redirect") ?? "/sessions");
  return redirectPath.startsWith("/") ? redirectPath : "/sessions";
}
