import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { countMotivationWords, getMotivationError } from "../src/lib/adoption-motivation";

const readSource = (file: string) => readFileSync(new URL(`../src/${file}`, import.meta.url), "utf8");

test("la motivación exige 30 palabras, no 2000 ni solo caracteres", () => {
  assert.equal(countMotivationWords("  Un hogar\nseguro, con cariño.  "), 5);
  assert.equal(countMotivationWords("... --- !!!"), 0);
  assert.ok(getMotivationError("hogar ".repeat(29)));
  assert.equal(getMotivationError("hogar ".repeat(30)), null);
  assert.equal(getMotivationError("hogar ".repeat(333)), null);
  assert.match(getMotivationError("hogar ".repeat(334)) ?? "", /máximo/);
});

test("formulario y servidor comparten la política de motivación", () => {
  for (const file of ["components/adopter.tsx", "lib/server-state.ts"]) {
    assert.match(readSource(file), /getMotivationError\(motivation\)|getMotivationError\(value\)/);
    assert.match(readSource(file), /MAX_MOTIVATION_CHARACTERS/);
  }
});

test("las instrucciones de Match preceden al mazo y los círculos no se encogen", () => {
  const adopter = readSource("components/adopter.tsx");
  assert.ok(adopter.indexOf('id="match-instructions"') < adopter.indexOf('className="swipe-deck"'));
  assert.match(readSource("app/globals.css"), /\.swipe-actions \.button\.icon\s*\{[^}]*flex: 0 0 62px;[^}]*min-width: 62px;[^}]*height: 62px/);
  assert.match(adopter, /className="timeline application-timeline"/);
});

test("el test enfoca el título al cambiar de paso y la portada tiene navegación de pie", () => {
  const wizard = readSource("components/test-wizard.tsx");
  assert.match(wizard, /headingRef.current\?\.focus\(\{ preventScroll: true \}\)/);
  assert.match(wizard, /scrollIntoView\(\{ block: "start", behavior: "instant" \}\)/);
  const landing = readSource("components/landing.tsx");
  assert.match(landing, /aria-label="Información de PataMatch"/);
  assert.match(landing, /aria-label="PataMatch, Un hogar, una nueva historia, inicio"/);
});
