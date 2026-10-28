import test from "node:test";
import assert from "node:assert/strict";
import { getPasswordValidationError, validatePasswordSecurity } from "../src/lib/password-policy";
import { getTrustedOrigins } from "../src/lib/trusted-origins";
import { getAuthBaseURL } from "../src/lib/auth-url";

test("la política común rechaza contraseñas que solo cumplen la longitud", () => {
  assert.equal(validatePasswordSecurity("aaaaaaaaaa").isValid, false);
  assert.match(getPasswordValidationError("aaaaaaaaaa") ?? "", /mayúsculas/);
  assert.equal(getPasswordValidationError("Bosque!7Sol9"), null);
});

test("la política valida secuencias, repeticiones, años y fechas", () => {
  for (const password of ["Bosque!123Sol", "Bosque!987Sol", "Bosque!111Sol", "Bosque!1998Sol", "Bosque!20/05Sol7"]) {
    assert.equal(validatePasswordSecurity(password).isValid, false, password);
    assert.ok(getPasswordValidationError(password));
  }
});

test("la política aplica ambos límites y todos los tipos de caracteres", () => {
  for (const password of ["Ab!7", "A".repeat(129) + "b!7", "BOSQUE!7SOL9", "bosque!7sol9", "BosqueSolo!", "Bosque7Solo9"]) {
    assert.equal(validatePasswordSecurity(password).isValid, false);
  }
});

test("los orígenes recibidos no se convierten en orígenes confiables", () => {
  const origins = getTrustedOrigins({ Origin: "https://externo.example", Host: "externo.example" });
  assert.equal(origins.includes("https://externo.example"), false);
  assert.equal(origins.includes("http://localhost:3000"), true);
});

test("los orígenes adicionales deben estar configurados explícitamente", () => {
  const origins = getTrustedOrigins({ BETTER_AUTH_URL: "http://localhost:3001", BETTER_AUTH_TRUSTED_ORIGINS: " https://refugio.example, https://refugio.example/ ,javascript:alert(1), no-es-url, https://usuario:clave@externo.example" });
  assert.equal(origins.includes("http://localhost:3001"), true);
  assert.equal(origins.filter(origin => origin === "https://refugio.example").length, 1);
  assert.equal(origins.some(origin => origin.includes("usuario") || origin.startsWith("javascript:")), false);
});

test("Vercel usa el dominio de producción sin confiar en cabeceras de petición", () => {
  const environment = { VERCEL: "1", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "patamatch.example", VERCEL_URL: "despliegue.example", Origin: "https://ajeno.example", Host: "ajeno.example" };
  assert.equal(getAuthBaseURL(environment), "https://patamatch.example");
  assert.deepEqual(getTrustedOrigins(environment), ["https://patamatch.example", "https://despliegue.example"]);
});

test("Vercel no conserva los orígenes locales ni permite HTTP", () => {
  const origins = getTrustedOrigins({ VERCEL: "1", BETTER_AUTH_URL: "https://patamatch.example", BETTER_AUTH_TRUSTED_ORIGINS: "http://localhost:3000, http://192.168.100.23:3000, https://equipo.example" });
  assert.deepEqual(origins, ["https://patamatch.example", "https://equipo.example"]);
  assert.throws(() => getAuthBaseURL({ VERCEL: "1", BETTER_AUTH_URL: "http://patamatch.example" }), /HTTPS/);
});

test("la URL explícita prevalece y previews usan su propio despliegue", () => {
  assert.equal(getAuthBaseURL({ VERCEL: "1", BETTER_AUTH_URL: "https://propio.example", VERCEL_URL: "temporal.example" }), "https://propio.example");
  assert.equal(getAuthBaseURL({ VERCEL: "1", VERCEL_ENV: "preview", VERCEL_PROJECT_PRODUCTION_URL: "produccion.example", VERCEL_URL: "preview.example" }), "https://preview.example");
});

test("una configuración de autenticación incompleta o inválida no se publica silenciosamente", () => {
  assert.throws(() => getAuthBaseURL({ VERCEL: "1" }), /Configura/);
  for (const address of ["https://usuario:clave@patamatch.example", "https://patamatch.example/ruta", "javascript:alert(1)"]) {
    assert.throws(() => getAuthBaseURL({ BETTER_AUTH_URL: address }));
  }
  assert.equal(getAuthBaseURL({}), "http://localhost:3000");
});
