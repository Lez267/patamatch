export function getRegistrationRole(intent: string | null | undefined): "ADOPTANTE" | "REFUGIO" {
  return intent === "REFUGIO" ? "REFUGIO" : "ADOPTANTE";
}
