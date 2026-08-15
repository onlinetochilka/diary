import { generateDemoData } from "../utils/demoData.js";

// Helper for sorting
function sortItems(items, sortOption) {
  if (!sortOption) return items;
  const isDesc = sortOption.startsWith("-");
  const field = isDesc ? sortOption.slice(1) : sortOption;
  return [...items].sort((a, b) => {
    let va = a[field];
    let vb = b[field];
    if (typeof va === "string") va = va.toLowerCase();
    if (typeof vb === "string") vb = vb.toLowerCase();
    if (va < vb) return isDesc ? 1 : -1;
    if (va > vb) return isDesc ? -1 : 1;
    return 0;
  });
}

// In-memory mock class simulating PocketBase Collection
class MockCollection {
  constructor(name, getDb, saveDb) {
    this.name = name;
    this.getDb = getDb;
    this.saveDb = saveDb;
  }

  get items() {
    return this.getDb()[this.name] || [];
  }

  async getFullList(options = {}) {
    let result = this.items;
    
    // Simulate basic sort
    if (options.sort) {
      result = sortItems(result, options.sort);
    }
    
    // Naive filter implementation for demo
    if (options.filter) {
      // userId = "..."  (used by user_config lookup)
      const userIdMatch = options.filter.match(/userId\s*=\s*"([^"]+)"/);
      if (userIdMatch) {
        result = result.filter(item => item.userId === userIdMatch[1] || item.user === userIdMatch[1]);
      }

      if (options.filter.includes("date >=")) {
        const match = options.filter.match(/date >= "([^"]+)"/);
        if (match) {
          result = result.filter(item => item.date >= match[1]);
        }
      }
      if (options.filter.includes("date <=")) {
        const match = options.filter.match(/date <= "([^"]+)"/);
        if (match) {
          result = result.filter(item => item.date <= match[1]);
        }
      }
    }
    
    return Promise.resolve(result);
  }

  async getList(page = 1, perPage = 30, options = {}) {
    let all = this.items;
    if (options.sort) all = sortItems(all, options.sort);
    const start = (page - 1) * perPage;
    const items = all.slice(start, start + perPage);
    return Promise.resolve({
      page,
      perPage,
      totalItems: all.length,
      totalPages: Math.ceil(all.length / perPage),
      items
    });
  }

  async getFirstListItem(filterStr, options = {}) {
    const list = await this.getFullList({ filter: filterStr, ...options });
    if (list.length === 0) throw new Error(`ClientResponseError: 404 (mock) no items found`);
    return list[0];
  }

  async getOne(id) {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      const err = new Error(`ClientResponseError 404: Record ${id} not found`);
      err.status = 404;
      return Promise.reject(err);
    }
    return Promise.resolve(item);
  }

  async create(data) {
    const db = this.getDb();
    const newId = data.id || ("mock_" + Math.random().toString(36).slice(2, 11));
    const cleanData = { ...data };
    delete cleanData.id;

    const newItem = {
      id: newId,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...cleanData
    };
    if (!db[this.name]) db[this.name] = [];
    db[this.name].push(newItem);
    this.saveDb(db);
    return Promise.resolve(newItem);
  }

  async update(id, data) {
    const db = this.getDb();
    if (!db[this.name]) db[this.name] = [];
    const index = db[this.name].findIndex(i => i.id === id);
    if (index === -1) {
      const err = new Error(`ClientResponseError 404: Record ${id} not found`);
      err.status = 404;
      return Promise.reject(err);
    }
    
    db[this.name][index] = {
      ...db[this.name][index],
      ...data,
      updated: new Date().toISOString()
    };
    this.saveDb(db);
    return Promise.resolve(db[this.name][index]);
  }

  async delete(id) {
    const db = this.getDb();
    if (!db[this.name]) return Promise.resolve(true);
    db[this.name] = db[this.name].filter(i => i.id !== id);
    this.saveDb(db);
    return Promise.resolve(true);
  }
}

// Global DB state and initialization
export function getMockDatabase() {
  const stored = localStorage.getItem("demo_db");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      let needsSave = false;
      Object.keys(parsed).forEach(colName => {
        if (Array.isArray(parsed[colName])) {
          parsed[colName].forEach(item => {
            if (!item.id) {
              item.id = "mock_" + Math.random().toString(36).slice(2, 11);
              needsSave = true;
            }
          });
        }
      });
      if (needsSave) {
        localStorage.setItem("demo_db", JSON.stringify(parsed));
      }
      return parsed;
    } catch (e) {
      console.error("Failed to parse demo_db", e);
    }
  }
  
  // If no DB exists in local storage, generate it.
  // This happens seamlessly and instantly.
  const newDb = generateDemoData("demo_tutor");
  localStorage.setItem("demo_db", JSON.stringify(newDb));
  return newDb;
}

export function saveMockDatabase(db) {
  localStorage.setItem("demo_db", JSON.stringify(db));
}

export function getMockCollection(collectionName) {
  return new MockCollection(collectionName, getMockDatabase, saveMockDatabase);
}
