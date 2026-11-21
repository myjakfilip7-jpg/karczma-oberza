// Logowanie do panelu: hasło z PANEL_PASSWORD, sesja w podpisanym ciasteczku httpOnly (12 h).
// Ten sam schemat co w panelu N°75 Osteria.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const COOKIE = "oberza_panel";
const TTL = 60 * 60 * 12;

export function createAuth({ password, secret, production }) {
  // Bez sekretu i hasła na produkcji klucz jest losowy, więc żadnej sesji nie da się podrobić znanym ciągiem.
  const key = secret || password || (production ? randomBytes(32).toString("hex") : "dev-secret-change-me");
  const sign = (payload) => createHmac("sha256", key).update(payload).digest("base64url");
  const same = (a, b) => {
    const x = Buffer.from(a);
    const y = Buffer.from(b);
    return x.length === y.length && timingSafeEqual(x, y);
  };

  return {
    configured: Boolean(password),
    check: (input) => Boolean(password) && typeof input === "string" && same(input, password),
    makeSession(nowSec) {
      const payload = String(nowSec + TTL);
      return { value: `${payload}.${sign(payload)}`, maxAge: TTL };
    },
    verify(value, nowSec) {
      if (!password || typeof value !== "string") return false;
      const [payload, sig] = value.split(".");
      if (!payload || !sig || !same(sign(payload), sig)) return false;
      return Number(payload) > nowSec;
    },
  };
}

export function readCookie(req, name) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function cookieHeader(name, value, { maxAge, secure }) {
  return [
    `${name}=${encodeURIComponent(value)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${maxAge}`, secure ? "Secure" : "",
  ].filter(Boolean).join("; ");
}
