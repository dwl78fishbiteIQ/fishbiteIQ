const DB_NAME = "lfa-photos";
const STORE = "photos";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function savePhoto(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearPhotos(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadPhoto(id: string): Promise<string | null> {
  const db = await openDb();
  const value = await new Promise<string | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const request = tx.objectStore(STORE).get(id);
    request.onsuccess = () => resolve(typeof request.result === "string" ? request.result : null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value;
}

export async function allPhotos(): Promise<Array<{ id: string; dataUrl: string }>> {
  const db = await openDb();
  const photos = await new Promise<Array<{ id: string; dataUrl: string }>>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const keysRequest = store.getAllKeys();
    keysRequest.onerror = () => reject(keysRequest.error);
    keysRequest.onsuccess = () => {
      const keys = keysRequest.result;
      if (!keys.length) {
        resolve([]);
        return;
      }
      const found: Array<{ id: string; dataUrl: string }> = [];
      let left = keys.length;
      for (const key of keys) {
        const get = store.get(key);
        get.onerror = () => reject(get.error);
        get.onsuccess = () => {
          if (typeof get.result === "string") found.push({ id: String(key), dataUrl: get.result });
          left -= 1;
          if (left === 0) resolve(found);
        };
      }
    };
  });
  db.close();
  return photos;
}
