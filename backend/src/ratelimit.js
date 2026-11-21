// Prosty limiter w pamięci procesu (jedna instancja aplikacji wystarcza dla jednej karczmy).
export function limiter({ windowMs, max }) {
  const hits = new Map();
  return {
    /** true = żądanie dozwolone. */
    take(key, nowMs) {
      if (hits.size > 5000) for (const [k, v] of hits) if (v.reset <= nowMs) hits.delete(k);
      const e = hits.get(key);
      if (!e || e.reset <= nowMs) { hits.set(key, { n: 1, reset: nowMs + windowMs }); return true; }
      e.n++;
      return e.n <= max;
    },
  };
}

/** Blokada logowania: 5 złych haseł z jednego IP = 15 min, globalnie najwyżej 30 złych prób na godzinę. */
export function loginGuard() {
  const perIp = new Map();
  let global = { n: 0, reset: 0 };
  return {
    blocked(ip, nowMs) {
      if (global.reset > nowMs && global.n >= 30) return true;
      const e = perIp.get(ip);
      return Boolean(e && e.until > nowMs);
    },
    fail(ip, nowMs) {
      if (global.reset <= nowMs) global = { n: 0, reset: nowMs + 3600e3 };
      global.n++;
      const e = perIp.get(ip) || { n: 0, until: 0 };
      if (e.until && e.until <= nowMs) { e.n = 0; e.until = 0; }
      e.n++;
      if (e.n >= 5) e.until = nowMs + 15 * 60e3;
      perIp.set(ip, e);
    },
    ok(ip) { perIp.delete(ip); },
  };
}
