export function getTrustedOrigins(environment: Record<string, string | undefined> = process.env): string[] {
  const configured = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://192.168.100.23:3000",
    environment.BETTER_AUTH_URL,
    ...(environment.BETTER_AUTH_TRUSTED_ORIGINS?.split(",") ?? []),
  ];
  const origins = configured.flatMap(value => {
    if (!value?.trim()) return [];
    try {
      const url = new URL(value.trim());
      return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? [url.origin] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(origins)];
}
