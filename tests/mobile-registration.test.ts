import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getRegistrationRole } from "../src/lib/registration-role";

test("registro público admite refugio sin permitir administrador o veterinario", () => {
  assert.equal(getRegistrationRole("REFUGIO"), "REFUGIO");
  for (const intent of [null, undefined, "ADOPTANTE", "ADMIN", "VETERINARIO", "refugio", ""]) assert.equal(getRegistrationRole(intent), "ADOPTANTE");
});

test("todos los accesos Para refugios abren el registro correcto", () => {
  const landing = readFileSync(new URL("../src/components/landing.tsx", import.meta.url), "utf8");
  assert.equal((landing.match(/onClick=\{openShelterRegistration\}/g) ?? []).length, 3);
  const login = readFileSync(new URL("../src/components/patamatch-app.tsx", import.meta.url), "utf8");
  assert.match(login, /setRegistrationRole\("REFUGIO"\); setMode\("register"\)/);
  assert.match(login, /router.replace\(registrationRole === "REFUGIO" \? "\/refugio" : "\/test"\)/);
  const auth = readFileSync(new URL("../src/lib/auth.ts", import.meta.url), "utf8");
  assert.match(auth, /role: \{ type: "string", defaultValue: "ADOPTANTE", input: false \}/);
  assert.match(auth, /getRegistrationRole\(context\?\.path === "\/sign-up\/email"/);
});

test("notificaciones móviles y footer tienen reglas específicas de encuadre", () => {
  const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /\.notification-dropdown \{ position: fixed; top: 84px; left: max\(14px/);
  assert.match(styles, /max-height: calc\(100dvh - 184px/);
  const landing = readFileSync(new URL("../src/components/landing.module.css", import.meta.url), "utf8");
  assert.match(landing, /\.footer \{ flex-direction: column; align-items: center; justify-content: center; text-align: center;/);
});
