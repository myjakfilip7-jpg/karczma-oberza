// Warstwa bazy: jeden interfejs dla SQLite (lokalnie, testy, mały serwer) i MySQL (Hostinger).
// Metody: exec(sql), all(sql, p), get(sql, p), run(sql, p) -> {id, changes}, tx(fn), close(), upsertSetting(name, json).
import fs from "node:fs";
import path from "node:path";
import { SCHEMA } from "./schema.js";

// node:sqlite przyjmuje tylko null, liczby, napisy i bufory — porządkujemy parametry w jednym miejscu.
function norm(params = []) {
  return params.map((v) => (v === undefined ? null : v === true ? 1 : v === false ? 0 : v));
}

async function openSqlite(file) {
  const { DatabaseSync } = await import("node:sqlite");
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  const api = {
    dialect: "sqlite",
    async exec(sql) { db.exec(sql); },
    async all(sql, p) { return db.prepare(sql).all(...norm(p)); },
    async get(sql, p) { return db.prepare(sql).get(...norm(p)) ?? null; },
    async run(sql, p) {
      const r = db.prepare(sql).run(...norm(p));
      return { id: Number(r.lastInsertRowid), changes: Number(r.changes) };
    },
    async upsertSetting(name, data, at) {
      return api.run(
        "INSERT INTO settings (name, data, updated_at) VALUES (?, ?, ?) ON CONFLICT(name) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at",
        [name, data, at],
      );
    },
    // SQLite działa synchronicznie, więc cała funkcja wykonuje się bez przeplotu z innymi żądaniami.
    async tx(fn) {
      db.exec("BEGIN IMMEDIATE");
      try {
        const r = await fn(api);
        db.exec("COMMIT");
        return r;
      } catch (e) {
        db.exec("ROLLBACK");
        throw e;
      }
    },
    async close() { db.close(); },
  };
  return api;
}

async function openMysql(url) {
  const mysql = (await import("mysql2/promise")).default;
  const pool = mysql.createPool({ uri: url, connectionLimit: 5, charset: "utf8mb4", timezone: "Z" });
  const wrap = (conn) => {
    const w = {
      dialect: "mysql",
      async exec(sql) {
        for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) await conn.query(stmt);
      },
      async all(sql, p) { const [rows] = await conn.execute(sql, norm(p)); return rows; },
      async get(sql, p) { const [rows] = await conn.execute(sql, norm(p)); return rows[0] ?? null; },
      async run(sql, p) {
        const [r] = await conn.execute(sql, norm(p));
        return { id: Number(r.insertId), changes: Number(r.affectedRows) };
      },
      async upsertSetting(name, data, at) {
        return w.run(
          "INSERT INTO settings (name, data, updated_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), updated_at = VALUES(updated_at)",
          [name, data, at],
        );
      },
    };
    return w;
  };
  const api = {
    ...wrap(pool),
    async tx(fn) {
      const c = await pool.getConnection();
      try {
        await c.beginTransaction();
        const r = await fn(wrap(c));
        await c.commit();
        return r;
      } catch (e) {
        await c.rollback();
        throw e;
      } finally {
        c.release();
      }
    },
    async close() { await pool.end(); },
  };
  return api;
}

export async function openDb(config) {
  const db = config.databaseUrl
    ? await openMysql(config.databaseUrl)
    : await openSqlite(config.sqliteFile ?? path.join(config.dataDir, "oberza.sqlite"));
  await db.exec(SCHEMA[db.dialect]);
  return db;
}
