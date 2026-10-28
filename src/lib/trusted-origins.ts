import { getAuthBaseURL } from "./auth-url";

export function getTrustedOrigins(environment: Record<string, string | undefined> = process.env): string[] {
  const cloud = environment.VERCEL === "1";
  const configured = [
    ...(!cloud ? ["http://localhost:3000", "http://127.0.0.1:3000", "http://192.168.100.23:3000"] : []),
    getAuthBaseURL(environment),
    ...(cloud && environment.VERCEL_URL ? [`https://${environment.VERCEL_URL}`] : []),
    ...(environment.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ];
  const origins = configured.flatMap(value => {
    if (!value?.trim()) return [];
    try {
      const url = new URL(value.trim());
      const validProtocol = cloud ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol);
      return validProtocol && !url.username && !url.password ? [url.origin] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(origins)];
}
