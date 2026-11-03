import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getContactPhoneError } from "../src/lib/contact-phone";
import { isDemoAccount } from "../src/lib/account-labels";
import { ContactPhoneField } from "../src/components/contact-phone-field";

test("teléfono admite solo diez dígitos y explica los incompletos o largos", () => {
  assert.equal(getContactPhoneError("2281234567"), null);
  assert.match(getContactPhoneError("") ?? "", /10 dígitos/);
  assert.match(getContactPhoneError("228123456") ?? "", /Falta 1 dígito/);
  assert.ok(getContactPhoneError("522281234567"));
  assert.ok(getContactPhoneError("22812345678"));
  assert.ok(getContactPhoneError("228123abcd"));
});

test("campo de teléfono ofrece validación nativa y ayuda asociada", () => {
  const html = renderToStaticMarkup(createElement(ContactPhoneField, { value: "2281234567", onChange: () => {} }));
  assert.match(html, /pattern="\[0-9\]\{10\}"/);
  assert.match(html, /inputMode="numeric"/);
  assert.match(html, /aria-describedby=/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /Teléfono válido: 10 dígitos/);
  const source = readFileSync(new URL("../src/components/contact-phone-field.tsx", import.meta.url), "utf8");
  assert.match(source, /onBlur=/);
  assert.match(source, /onInvalid=/);
  assert.match(source, /aria-invalid=\{invalid\}/);
});

test("solo las cuatro cuentas de ejemplo llevan etiqueta Demo", () => {
  for (const role of ["adoptante", "refugio", "veterinario", "admin"]) assert.equal(isDemoAccount(`${role}@patamatch.local`), true);
  assert.equal(isDemoAccount(" ADMIN@PATAMATCH.LOCAL "), true);
  assert.equal(isDemoAccount("persona@gmail.com"), false);
  assert.equal(isDemoAccount("otra@patamatch.local"), false);
  assert.equal(isDemoAccount("admin@patamatch.local.ejemplo.com"), false);
});

test("el aviso de completar test solo aparece mientras está incompleto", () => {
  const source = readFileSync(new URL("../src/components/adopter.tsx", import.meta.url), "utf8");
  assert.match(source, /!state.profile\?\.completed && <section className="hero-strip"/);
  assert.match(source, /state.profile\?\.completed && <Link className="button secondary" href="\/test"/);
  const shell = readFileSync(new URL("../src/components/patamatch-app.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(shell, /Demo local|Entorno local · Datos de demostración/);
  assert.match(shell, /isDemoAccount\(state.user.email\) && <span className="badge subtle">Demo/);
});
