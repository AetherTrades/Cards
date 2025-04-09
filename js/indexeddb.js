// js/indexeddb.js

const DB_NAME = "MTGCardCache";
const STORE_NAME = "cards";
const VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);
    request.onerror = (e) => reject(e);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      db.createObjectStore(STORE_NAME);
    };
  });
}

export function cacheCardData(db, id, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(data, id);
    tx.oncomplete = () => resolve();
    tx.onerror = reject;
  });
}

export function getCachedCard(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = reject;
  });
}

export async function cleanupUnusedCards(db, validIds) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const allKeysRequest = store.getAllKeys();

    allKeysRequest.onsuccess = () => {
      const allKeys = allKeysRequest.result;
      for (const key of allKeys) {
        if (!validIds.includes(key)) {
          store.delete(key);
        }
      }
      resolve();
    };

    allKeysRequest.onerror = reject;
  });
}