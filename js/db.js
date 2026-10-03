// 옷장과 기록 저장소. 사진을 포함해 모두 이 기기의 브라우저(IndexedDB)에 저장된다.
(function (root) {
  const NAME = 'codi-app';
  let dbPromise;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(NAME, 1);
        req.onupgradeneeded = () => {
          req.result.createObjectStore('items', { keyPath: 'id' });
          req.result.createObjectStore('log', { keyPath: 'id' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    return dbPromise;
  }

  async function run(store, mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, mode);
      const req = fn(tx.objectStore(store));
      tx.oncomplete = () => resolve(req && req.result);
      tx.onerror = () => reject(tx.error);
    });
  }

  const DB = {
    all: (store) => run(store, 'readonly', (s) => s.getAll()),
    put: (store, value) => run(store, 'readwrite', (s) => s.put(value)),
    remove: (store, id) => run(store, 'readwrite', (s) => s.delete(id)),
    clear: (store) => run(store, 'readwrite', (s) => s.clear()),
  };

  const DEFAULT_SETTINGS = {
    // 공개 주소에 올라가는 파일이라 개인 수치는 넣지 않는다. 설정 화면에서 입력하면 기기에만 저장된다.
    profile: { height: 175, weight: 70, age: 35, skin: 'tan', style: 'both' },
    place: { name: '서울', lat: 37.5665, lon: 126.978 },
    feedback: {},
    sync: { token: '', repo: '790725kjs-bot/codi-data' },
  };

  function loadSettings() {
    try {
      const saved = JSON.parse(localStorage.getItem('codi-settings') || '{}');
      return {
        ...DEFAULT_SETTINGS, ...saved,
        profile: { ...DEFAULT_SETTINGS.profile, ...saved.profile },
        place: { ...DEFAULT_SETTINGS.place, ...saved.place },
        sync: { ...DEFAULT_SETTINGS.sync, ...saved.sync },
      };
    } catch (e) {
      return structuredClone(DEFAULT_SETTINGS);
    }
  }

  function saveSettings(settings) {
    localStorage.setItem('codi-settings', JSON.stringify(settings));
  }

  const blobToDataUrl = (blob) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  async function exportAll() {
    const items = await DB.all('items');
    for (const item of items) {
      if (item.photo instanceof Blob) item.photo = await blobToDataUrl(item.photo);
    }
    const settings = loadSettings();
    settings.sync = { ...settings.sync, token: '' }; // 연결 키는 백업 파일에 넣지 않는다
    return { version: 1, exported: new Date().toISOString(), settings, items: items.filter((i) => !i.deleted), log: await DB.all('log') };
  }

  async function importAll(data) {
    if (!data || !Array.isArray(data.items)) throw new Error('백업 파일 형식이 아닙니다');
    await DB.clear('items');
    await DB.clear('log');
    for (const item of data.items) {
      if (typeof item.photo === 'string') item.photo = await (await fetch(item.photo)).blob();
      item.updated = Date.now(); // 복원한 옷은 방금 바뀐 것으로 보고 다른 기기에도 전한다
      await DB.put('items', item);
    }
    for (const entry of data.log || []) await DB.put('log', entry);
    if (data.settings) saveSettings({ ...data.settings, sync: loadSettings().sync, updated: Date.now() });
  }

  root.CODI_DB = { DB, loadSettings, saveSettings, exportAll, importAll };
})(window);
