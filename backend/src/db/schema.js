// Schemat bazy w dwóch dialektach. Zapytania w repo.js są wspólne dla obu.
// Kwoty w groszach (liczby całkowite). Daty jako tekst ISO (YYYY-MM-DD, HH:MM, znacznik czasu UTC).

const sqlite = `
CREATE TABLE IF NOT EXISTS menu_categories (
  id TEXT PRIMARY KEY,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  name_en TEXT,
  note TEXT,
  note_en TEXT
);
CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY,
  category_id TEXT NOT NULL REFERENCES menu_categories(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  name TEXT NOT NULL,
  name_en TEXT,
  description TEXT,
  description_en TEXT,
  portion TEXT,
  portion_en TEXT,
  prices TEXT NOT NULL,
  available INTEGER NOT NULL DEFAULT 1,
  hidden INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS settings (
  name TEXT PRIMARY KEY,
  data TEXT NOT NULL,
  updated_at TEXT
);
CREATE TABLE IF NOT EXISTS reservations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  date TEXT NOT NULL,
  time TEXT NOT NULL,
  people INTEGER NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  note TEXT,
  rondel INTEGER NOT NULL DEFAULT 0,
  lang TEXT NOT NULL DEFAULT 'pl',
  status TEXT NOT NULL DEFAULT 'nowa',
  staff_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_reservations_slot ON reservations (date, time);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  note TEXT,
  desired_time TEXT,
  items TEXT NOT NULL,
  total INTEGER NOT NULL,
  lang TEXT NOT NULL DEFAULT 'pl',
  status TEXT NOT NULL DEFAULT 'nowe',
  eta_minutes INTEGER,
  staff_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders (created_at);
`;

const mysql = `
CREATE TABLE IF NOT EXISTS menu_categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  position INT NOT NULL DEFAULT 0,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  note TEXT,
  note_en TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS menu_items (
  id VARCHAR(96) NOT NULL PRIMARY KEY,
  category_id VARCHAR(64) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  name VARCHAR(200) NOT NULL,
  name_en VARCHAR(200),
  description TEXT,
  description_en TEXT,
  portion VARCHAR(100),
  portion_en VARCHAR(100),
  prices TEXT NOT NULL,
  available TINYINT NOT NULL DEFAULT 1,
  hidden TINYINT NOT NULL DEFAULT 0,
  updated_at VARCHAR(32),
  CONSTRAINT fk_items_category FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS settings (
  name VARCHAR(64) NOT NULL PRIMARY KEY,
  data MEDIUMTEXT NOT NULL,
  updated_at VARCHAR(32)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS reservations (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32),
  date VARCHAR(10) NOT NULL,
  time VARCHAR(5) NOT NULL,
  people INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  email VARCHAR(200),
  note TEXT,
  rondel TINYINT NOT NULL DEFAULT 0,
  lang VARCHAR(2) NOT NULL DEFAULT 'pl',
  status VARCHAR(20) NOT NULL DEFAULT 'nowa',
  staff_note TEXT,
  INDEX idx_reservations_slot (date, time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS orders (
  id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  created_at VARCHAR(32) NOT NULL,
  updated_at VARCHAR(32),
  type VARCHAR(10) NOT NULL,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(40) NOT NULL,
  address VARCHAR(300),
  note TEXT,
  desired_time VARCHAR(10),
  items MEDIUMTEXT NOT NULL,
  total INT NOT NULL,
  lang VARCHAR(2) NOT NULL DEFAULT 'pl',
  status VARCHAR(20) NOT NULL DEFAULT 'nowe',
  eta_minutes INT,
  staff_note TEXT,
  INDEX idx_orders_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

export const SCHEMA = { sqlite, mysql };
