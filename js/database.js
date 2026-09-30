class SQLiteDB {
  constructor() {
    this.db = null;
    this.isReady = false;
  }

  async init() {
    try {
      if (window.initSqlJs) {
        const SQL = await window.initSqlJs({
          locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
        });

        const savedDb = localStorage.getItem('pich_sqlite_db_binary');
        if (savedDb) {
          const u8 = new Uint8Array(JSON.parse(savedDb));
          this.db = new SQL.Database(u8);
        } else {
          this.db = new SQL.Database();
          this.createTables();
          this.seedInitialData();
        }
        this.isReady = true;
      } else {
        this.fallbackInit();
      }
    } catch (e) {
      this.fallbackInit();
    }
  }

  createTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price REAL NOT NULL,
        specs TEXT,
        tag TEXT,
        stock INTEGER,
        image TEXT,
        description TEXT
      );
      CREATE TABLE IF NOT EXISTS orders (
        order_id TEXT PRIMARY KEY,
        date TEXT,
        buyer TEXT,
        payment_method TEXT,
        total REAL,
        items_json TEXT
      );
    `);
    this.persist();
  }

  seedInitialData() {
    if (typeof STORE_PRODUCTS !== 'undefined' && Array.isArray(STORE_PRODUCTS)) {
      const stmt = this.db.prepare(`
        INSERT INTO products (id, name, category, price, specs, tag, stock, image, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const p of STORE_PRODUCTS) {
        stmt.run([p.id, p.name, p.category, p.price, p.specs, p.tag, p.stock, p.image, p.description]);
      }
      stmt.free();
      this.persist();
    }
  }

  persist() {
    if (this.db) {
      try {
        const data = this.db.export();
        const arr = Array.from(data);
        localStorage.setItem('pich_sqlite_db_binary', JSON.stringify(arr));
      } catch (e) {}
    }
  }

  getAllProducts() {
    if (this.isReady && this.db) {
      const res = this.db.exec("SELECT * FROM products ORDER BY name ASC");
      if (res.length > 0) {
        const columns = res[0].columns;
        return res[0].values.map(row => {
          const obj = {};
          columns.forEach((col, idx) => { obj[col] = row[idx]; });
          return obj;
        });
      }
      return [];
    }
    return this.fallbackGetProducts();
  }

  addProduct(product) {
    if (this.isReady && this.db) {
      this.db.run(`
        INSERT OR REPLACE INTO products (id, name, category, price, specs, tag, stock, image, description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [product.id, product.name, product.category, product.price, product.specs, product.tag, product.stock, product.image, product.description]);
      this.persist();
      return true;
    }
    return this.fallbackAddProduct(product);
  }

  deleteProduct(id) {
    if (this.isReady && this.db) {
      this.db.run("DELETE FROM products WHERE id = ?", [id]);
      this.persist();
      return true;
    }
    return this.fallbackDeleteProduct(id);
  }

  exportSqliteFile() {
    if (this.isReady && this.db) {
      const binary = this.db.export();
      const blob = new Blob([binary], { type: 'application/x-sqlite3' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pich_market_database_${new Date().toISOString().slice(0, 10)}.sqlite`;
      a.click();
    } else {
      const json = JSON.stringify(this.getAllProducts(), null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pich_market_backup.json`;
      a.click();
    }
  }

  fallbackInit() {
    this.isReady = true;
    if (!localStorage.getItem('pich_fallback_products')) {
      if (typeof STORE_PRODUCTS !== 'undefined') {
        localStorage.setItem('pich_fallback_products', JSON.stringify(STORE_PRODUCTS));
      }
    }
  }

  fallbackGetProducts() {
    try {
      const raw = localStorage.getItem('pich_fallback_products');
      return raw ? JSON.parse(raw) : (typeof STORE_PRODUCTS !== 'undefined' ? STORE_PRODUCTS : []);
    } catch (e) {
      return typeof STORE_PRODUCTS !== 'undefined' ? STORE_PRODUCTS : [];
    }
  }

  fallbackAddProduct(p) {
    const list = this.fallbackGetProducts();
    const idx = list.findIndex(i => i.id === p.id);
    if (idx >= 0) list[idx] = p;
    else list.unshift(p);
    localStorage.setItem('pich_fallback_products', JSON.stringify(list));
    return true;
  }

  fallbackDeleteProduct(id) {
    const list = this.fallbackGetProducts().filter(i => i.id !== id);
    localStorage.setItem('pich_fallback_products', JSON.stringify(list));
    return true;
  }
}

const Database = new SQLiteDB();
