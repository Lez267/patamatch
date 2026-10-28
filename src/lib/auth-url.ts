export function getAuthBaseURL(environment: Record<string, string | undefined> = process.env): string {
  const cloud = environment.VERCEL === "1";
  const domain = environment.VERCEL_ENV === "production"
    ? environment.VERCEL_PROJECT_PRODUCTION_URL || environment.VERCEL_URL
    : environment.VERCEL_URL;
  const configured = environment.BETTER_AUTH_URL?.trim() || (cloud ? domain && `https://${domain}` : "http://localhost:3000");
  if (!configured) throw new Error("Configura BETTER_AUTH_URL o habilita las variables de sistema de Vercel.");
  const url = new URL(configured);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BETTER_AUTH_URL debe ser un origen HTTP/HTTPS, sin ruta ni credenciales.");
  }
  if (cloud && url.protocol !== "https:") throw new Error("La autenticación en Vercel requiere HTTPS.");
  return url.origin;
}
