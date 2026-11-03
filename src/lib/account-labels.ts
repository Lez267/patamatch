export function isDemoAccount(email: string): boolean {
  return ["adoptante@patamatch.local", "refugio@patamatch.local", "veterinario@patamatch.local", "admin@patamatch.local"].includes(email.trim().toLowerCase());
}
