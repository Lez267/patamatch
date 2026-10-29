import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PasswordField } from "../src/components/password-field";
import { getPasswordConfirmationError } from "../src/lib/password-policy";

test("la contraseña empieza oculta y conserva la etiqueta y el autocompletado", () => {
  const markup = renderToStaticMarkup(createElement(PasswordField, { value: "", onChange: () => {} }));
  assert.match(markup, /type="password"/);
  assert.match(markup, /autoComplete="current-password"/);
  assert.match(markup, /minLength="8"/);
  assert.match(markup, /required=""/);
  const inputId = markup.match(/<input id="([^"]+)"/)![1];
  assert.ok(markup.includes(`<label for="${inputId}">Contraseña</label>`));
  assert.ok(markup.includes(`aria-controls="${inputId}"`));
});

test("mostrar contraseña es un botón accesible que no envía el formulario", () => {
  const markup = renderToStaticMarkup(createElement(PasswordField, { value: "", onChange: () => {} }));
  assert.match(markup, /type="button"/);
  assert.match(markup, /aria-label="Mostrar contraseña"/);
  assert.match(markup, /aria-pressed="false"/);
  assert.doesNotMatch(markup, /type="submit"/);
});

test("confirmar contraseña conserva límites, autocompletado y error asociado", () => {
  const markup = renderToStaticMarkup(createElement(PasswordField, {
    value: "", onChange: () => {}, label: "Confirmar contraseña", autoComplete: "new-password",
    minLength: 10, maxLength: 128, error: "Las contraseñas no coinciden.",
  }));
  assert.match(markup, /autoComplete="new-password"/);
  assert.match(markup, /minLength="10"/);
  assert.match(markup, /maxLength="128"/);
  assert.match(markup, /aria-label="Mostrar confirmación de contraseña"/);
  assert.match(markup, /aria-invalid="true"/);
  const errorId = markup.match(/aria-describedby="([^"]+)"/)![1];
  assert.ok(markup.includes(`id="${errorId}"`));
  assert.match(markup, /aria-live="polite"/);
});

test("la confirmación exige igualdad exacta sin recortar ni cambiar mayúsculas", () => {
  const password = "Bosque!7Luna9";
  assert.equal(getPasswordConfirmationError(password, password), null);
  for (const confirmation of ["", "Bosque!7luna9", `${password} `, "OtraClave!8Bosque"]) {
    assert.ok(getPasswordConfirmationError(password, confirmation));
  }
});
