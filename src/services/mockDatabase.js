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
    // The real app mostly filters by tutorId, which is safe to ignore here since demo DB is isolated.
    if (options.filter) {
      if (options.filter.includes("date >=")) {
        // e.g. date >= "2026-08-01"
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
    if (!item) return Promise.reject(new Error(`ClientResponseError 404: Record ${id} not found`));
    return Promise.resolve(item);
  }

  async create(data) {
    const db = this.getDb();
    const newItem = {
      id: "mock_" + Math.random().toString(36).slice(2, 11),
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      ...data
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
    if (index === -1) return Promise.reject(new Error(`ClientResponseError 404: Record ${id} not found`));
    
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
      return JSON.parse(stored);
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
