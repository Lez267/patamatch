import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { applicationAnchor, applicationHref } from "../src/lib/application-links";

const styles = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");
const landingStyles = readFileSync(new URL("../src/components/landing.module.css", import.meta.url), "utf8");

function luminance(color: string) {
  const channels = color.match(/[a-f\d]{2}/gi)!.map(channel => {
    const value = parseInt(channel, 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

test("el color secundario supera 4,5 en los fondos señalados por las auditorías", () => {
  const foreground = styles.match(/--muted:\s*(#[a-f\d]{6})/i)![1];
  for (const background of ["#eaefe7", "#e7ede3", "#dfe9d7", "#dce7d7", "#d6e1cf"]) {
    const ratio = (luminance(background) + 0.05) / (luminance(foreground) + 0.05);
    assert.ok(ratio >= 4.5, `${foreground} sobre ${background}: ${ratio}`);
  }
  assert.match(styles, /\.sidebar-tip p\s*\{[^}]*color:\s*var\(--muted\)/);
  assert.match(styles, /\.desktop-breadcrumb > span\s*\{[^}]*color:\s*var\(--muted\)/);
});

test("los textos auxiliares seleccionados no vuelven a tamaños de 8 a 10 px", () => {
  assert.match(styles, /\.brand-wordmark > span\s*\{[^}]*font-size:\s*12px/);
  assert.match(styles, /\.sidebar-footer > small\s*\{[^}]*font-size:\s*12px/);
  const footerRules = [...landingStyles.matchAll(/\.footer\s*\{([^}]+)\}/g)].filter(rule => rule[1].includes("font-size"));
  assert.ok(footerRules.length > 0);
  for (const rule of footerRules) assert.match(rule[1], /font-size:\s*12px/);
  assert.match(landingStyles, /\.brand :global\(\.brand-wordmark\) > span\s*\{[^}]*font-size:\s*12px/);
});

test("cada solicitud tiene un destino propio, también con caracteres reservados", () => {
  for (const applicationId of ["demo-luna", "otra-solicitud", "solicitud con # / ñ"]) {
    const href = applicationHref(applicationId);
    const target = new URL(href, "http://localhost:3001");
    assert.equal(target.pathname, "/adopciones");
    assert.equal(decodeURIComponent(target.hash.slice(1)), applicationAnchor(applicationId));
  }
  assert.notEqual(applicationHref("primera"), applicationHref("segunda"));
});
