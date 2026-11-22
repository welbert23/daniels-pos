-- Point of Sales Inventory Management System - POS database (XAMPP MySQL / MariaDB)
-- Import via phpMyAdmin or: mysql -u root < database.sql

CREATE DATABASE IF NOT EXISTS daniels_pos
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE daniels_pos;

CREATE TABLE IF NOT EXISTS meta (
  id   TINYINT PRIMARY KEY,
  seq  INT NOT NULL DEFAULT 0,
  seed VARCHAR(50) NOT NULL DEFAULT ''
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS categories (
  kind       VARCHAR(20) NOT NULL,
  name       VARCHAR(60) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  PRIMARY KEY (kind, name)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id       VARCHAR(40) PRIMARY KEY,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name     VARCHAR(150) NOT NULL,
  role     VARCHAR(30) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_users_username (username)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS items (
  id         VARCHAR(40) PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  barcode    VARCHAR(60) NOT NULL DEFAULT '',
  category   VARCHAR(60) NOT NULL,
  price      DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost       DECIMAL(12,2) NOT NULL DEFAULT 0,
  stock      DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock  DECIMAL(12,3) NOT NULL DEFAULT 0,
  expiry     DATE NULL DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS item_recipes (
  item_id VARCHAR(40) NOT NULL,
  name    VARCHAR(150) NOT NULL,
  qty     DECIMAL(12,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (item_id, name),
  CONSTRAINT fk_recipe_item FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS ingredients (
  id         VARCHAR(40) PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  category   VARCHAR(60) NOT NULL,
  unit       VARCHAR(30) NOT NULL DEFAULT '',
  stock      DECIMAL(12,3) NOT NULL DEFAULT 0,
  min_stock  DECIMAL(12,3) NOT NULL DEFAULT 0,
  expiry     DATE NULL DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS customers (
  id         VARCHAR(40) PRIMARY KEY,
  name       VARCHAR(150) NOT NULL,
  phone      VARCHAR(60) NOT NULL DEFAULT '',
  email      VARCHAR(150) NOT NULL DEFAULT '',
  address    VARCHAR(255) NOT NULL DEFAULT '',
  created    DATETIME NULL DEFAULT NULL,
  sort_order INT NOT NULL DEFAULT 0
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id          VARCHAR(40) PRIMARY KEY,
  ref         VARCHAR(60) NOT NULL,
  date        DATETIME NULL DEFAULT NULL,
  subtotal    DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount    DECIMAL(12,2) NOT NULL DEFAULT 0,
  total       DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment     DECIMAL(12,2) NOT NULL DEFAULT 0,
  `change`    DECIMAL(12,2) NOT NULL DEFAULT 0,
  cashier     VARCHAR(150) NOT NULL DEFAULT '',
  cashier_id  VARCHAR(40) NOT NULL DEFAULT '',
  customer    VARCHAR(150) NOT NULL DEFAULT '',
  customer_id VARCHAR(40) NOT NULL DEFAULT '',
  order_type  VARCHAR(40) NOT NULL DEFAULT 'Dine-in',
  note        VARCHAR(500) NOT NULL DEFAULT '',
  status      VARCHAR(30) NOT NULL DEFAULT 'completed',
  sort_order  INT NOT NULL DEFAULT 0,
  UNIQUE KEY uq_transactions_ref (ref)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transaction_items (
  tx_id    VARCHAR(40) NOT NULL,
  position INT NOT NULL,
  name     VARCHAR(150) NOT NULL,
  qty      DECIMAL(12,3) NOT NULL DEFAULT 0,
  price    DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (tx_id, position),
  CONSTRAINT fk_txitem_tx FOREIGN KEY (tx_id) REFERENCES transactions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS schedules (
  user_id     VARCHAR(40) PRIMARY KEY,
  days        VARCHAR(30) NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  days2       VARCHAR(30) NOT NULL DEFAULT 'Mon,Tue,Wed,Thu,Fri',
  start_time  VARCHAR(5)  NOT NULL DEFAULT '08:00',
  end_time    VARCHAR(5)  NOT NULL DEFAULT '18:00',
  grace_min   INT NOT NULL DEFAULT 10,
  updated_at  DATETIME NOT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id      VARCHAR(40)  NOT NULL,
  username     VARCHAR(100) NOT NULL DEFAULT '',
  name         VARCHAR(150) NOT NULL DEFAULT '',
  role         VARCHAR(30)  NOT NULL DEFAULT '',
  work_date    DATE NOT NULL,
  time_in      DATETIME NULL,
  lunch_out    DATETIME NULL,
  lunch_in     DATETIME NULL,
  coffee_out   DATETIME NULL,
  coffee_in    DATETIME NULL,
  time_out     DATETIME NULL,
  status       VARCHAR(20) NOT NULL DEFAULT 'out',
  updated_at   DATETIME NOT NULL,
  UNIQUE KEY uq_attendance_day (user_id, work_date)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS audit_log (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  ts            DATETIME NOT NULL,
  actor_id      VARCHAR(40)  NOT NULL DEFAULT '',
  actor_name    VARCHAR(150) NOT NULL DEFAULT '',
  actor_username VARCHAR(100) NOT NULL DEFAULT '',
  actor_role    VARCHAR(30)  NOT NULL DEFAULT '',
  action        VARCHAR(20)  NOT NULL,
  entity        VARCHAR(40)  NOT NULL,
  entity_id     VARCHAR(60)  NOT NULL DEFAULT '',
  summary       VARCHAR(255) NOT NULL DEFAULT '',
  before_json   TEXT NULL,
  after_json    TEXT NULL,
  INDEX idx_audit_ts (ts DESC)
) ENGINE=InnoDB;

INSERT INTO meta (id, seq, seed)
  VALUES (1, 0, '')
  ON DUPLICATE KEY UPDATE id = id;

-- Initial logins (source of truth = database, not index.html)
INSERT IGNORE INTO users (id, username, password, name, role, sort_order) VALUES
  ('u1', 'user',      '<redacted>',   'User',              'superadmin', 0),
  ('u2', 'client',    '<redacted>',    'Bedia Gerro F.',    'client',     1),
  ('u3', 'staff',     '<redacted>',     'Mahinay Irish D.',  'cashier',    2),
  ('u4', 'inventory', '<redacted>', 'Inventory Encoder', 'inventory',  3);

-- Initial categories (item + ingredient)
INSERT IGNORE INTO categories (kind, name, sort_order) VALUES
  ('item', 'BBQ Platters', 0), ('item', 'Burgers', 1), ('item', 'Sides', 2),
  ('item', 'Drinks', 3), ('item', 'Desserts', 4),
  ('ingredient', 'Meat', 0), ('ingredient', 'Poultry', 1), ('ingredient', 'Seafood', 2),
  ('ingredient', 'Produce', 3), ('ingredient', 'Dairy', 4), ('ingredient', 'Dry Goods', 5),
  ('ingredient', 'Sauce & Marinade', 6), ('ingredient', 'Pantry', 7);
