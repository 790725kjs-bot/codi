// 기기 간 동기화. 본인 GitHub 계정의 비공개 저장소를 옷장 보관소로 쓴다.
//   items/<id>.json  옷 정보 (삭제된 옷은 deleted 표시만 남긴다)
//   photos/<id>.jpg  옷 사진 (한 번만 올린다)
//   state.json       내 정보와 좋아요/싫어요
// 같은 옷이 두 기기에서 바뀌면 더 나중에 바뀐 쪽이 이긴다.
(function (root) {
  const { DB, loadSettings, saveSettings } = root.CODI_DB;
  const STATE_KEY = 'codi-sync-state';

  const loadState = () => {
    try { return { sha: {}, pushed: {}, ...JSON.parse(localStorage.getItem(STATE_KEY) || '{}') }; }
    catch (e) { return { sha: {}, pushed: {} }; }
  };
  const saveState = (s) => localStorage.setItem(STATE_KEY, JSON.stringify(s));

  const utf8ToBase64 = (text) => {
    const bytes = new TextEncoder().encode(text);
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(bin);
  };
  const base64ToUtf8 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), (c) => c.charCodeAt(0)));
  const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

  function client({ token, repo }) {
    const call = async (path, { method = 'GET', raw = false, body } = {}) => {
      const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
        method,
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) throw new Error('연결 키가 올바르지 않거나 만료됐습니다');
      if (res.status === 403) throw new Error('연결 키에 저장소 쓰기 권한이 없거나 요청이 너무 많습니다');
      return res;
    };
    return {
      async list(dir) {
        const res = await call(dir);
        if (res.status === 404) return [];
        if (!res.ok) throw new Error(`목록을 읽지 못했습니다 (${res.status})`);
        return res.json();
      },
      async json(path) {
        const res = await call(path);
        if (res.status === 404) return null;
        if (!res.ok) throw new Error(`읽지 못했습니다 (${res.status})`);
        const file = await res.json();
        return { sha: file.sha, value: JSON.parse(base64ToUtf8(file.content)) };
      },
      async blob(path) {
        const res = await call(path, { raw: true });
        if (!res.ok) throw new Error(`사진을 받지 못했습니다 (${res.status})`);
        return res.blob();
      },
      async put(path, base64, sha) {
        const res = await call(path, { method: 'PUT', body: { message: `sync ${path}`, content: base64, sha: sha || undefined } });
        if (res.status === 404) throw new Error('보관소 저장소를 찾지 못했습니다. 저장소 이름과 연결 키 권한을 확인하세요');
        if (res.status === 409 || res.status === 422) return null; // 다른 기기가 먼저 바꿈. 다음 동기화에서 맞춘다
        if (!res.ok) throw new Error(`올리지 못했습니다 (${res.status})`);
        return (await res.json()).content.sha;
      },
    };
  }

  // 사진을 바꾸면 photoRev 가 바뀌고, 새 이름으로 올려 다른 기기가 다시 받게 한다
  const photoName = (x) => (x.photoRev ? `${x.id}-${x.photoRev}` : x.id);

  let running = false, again = false;

  // 반환: { pulled, pushed } 받은 수와 올린 수
  async function sync(onProgress = () => {}) {
    const settings = loadSettings();
    if (!settings.sync || !settings.sync.token) return null;
    if (running) { again = true; return null; }
    running = true;
    try {
      const gh = client(settings.sync);
      const st = loadState();
      let pulled = 0, pushed = 0;

      // 옷장과 착용 기록을 차례로 맞춘다. 착용 기록은 kind 가 'worn' 인 것만 다룬다.
      const collections = [
        { store: 'items', dir: 'items', photoDir: 'photos', keep: (i) => !i.id.startsWith('demo'), what: '옷' },
        { store: 'log', dir: 'worn', photoDir: 'wornphotos', keep: (i) => i.kind === 'worn', what: '착용 기록' },
      ];
      for (const { store, dir, photoDir, keep, what } of collections) {
      onProgress(`${what} 확인 중`);
      const [metaList, photoList] = await Promise.all([gh.list(dir), gh.list(photoDir)]);
      const remote = new Map(metaList.filter((f) => f.name.endsWith('.json')).map((f) => [f.name.slice(0, -5), f.sha]));
      const remotePhotos = new Set(photoList.map((f) => f.name.replace(/\.jpg$/, '')));
      // 미리 보기용 예시 옷(#demo)은 보관소에 올리지 않는다
      const local = new Map((await DB.all(store)).filter(keep).map((i) => [i.id, i]));

      // 1) 다른 기기에서 바뀐 옷 받기
      const changed = [...remote].filter(([id, sha]) => st.sha[id] !== sha);
      for (let n = 0; n < changed.length; n++) {
        const [id, sha] = changed[n];
        onProgress(`${what} 받는 중 ${n + 1}/${changed.length}`);
        const file = await gh.json(`${dir}/${id}.json`);
        if (!file) continue;
        const r = file.value, l = local.get(id);
        if (!l || (r.updated || 0) > (l.updated || 0)) {
          let photo = null;
          if (!r.deleted && r.hasPhoto) photo = (l && l.photo && (l.photoRev || 0) === (r.photoRev || 0)) ? l.photo : await gh.blob(`${photoDir}/${photoName(r)}.jpg`);
          const { hasPhoto, ...item } = r;
          const merged = { ...item, photo };
          await DB.put(store, merged);
          local.set(id, merged);
          st.pushed[id] = r.updated || 0;
          pulled++;
        } else if ((r.updated || 0) === (l.updated || 0)) {
          st.pushed[id] = l.updated || 0;
        }
        st.sha[id] = sha;
        saveState(st);
      }

      // 2) 이 기기에서 바뀐 옷 올리기
      const dirty = [...local.values()].filter((i) => !remote.has(i.id) || st.pushed[i.id] !== (i.updated || 0));
      for (let n = 0; n < dirty.length; n++) {
        const item = dirty[n];
        onProgress(`${what} 올리는 중 ${n + 1}/${dirty.length}`);
        if (item.photo && !item.deleted && !remotePhotos.has(photoName(item))) {
          await gh.put(`${photoDir}/${photoName(item)}.jpg`, await blobToBase64(item.photo));
        }
        const { photo, ...meta } = item;
        meta.hasPhoto = !!photo;
        meta.updated = item.updated || 0;
        const sha = await gh.put(`${dir}/${item.id}.json`, utf8ToBase64(JSON.stringify(meta)), st.sha[item.id] || remote.get(item.id));
        if (sha) {
          st.sha[item.id] = sha;
          st.pushed[item.id] = meta.updated;
          saveState(st);
          pushed++;
        }
      }
      }

      // 3) 내 정보와 좋아요/싫어요
      onProgress('설정 맞추는 중');
      const remoteState = await gh.json('state.json');
      const mine = loadSettings();
      const mineAt = mine.updated || 0, theirsAt = remoteState ? remoteState.value.updated || 0 : -1;
      if (remoteState && theirsAt > mineAt) {
        saveSettings({ ...mine, profile: remoteState.value.profile, feedback: remoteState.value.feedback, updated: theirsAt });
        pulled++;
      } else if (mineAt > theirsAt && mineAt > 0) {
        const doc = { profile: mine.profile, feedback: mine.feedback, updated: mineAt };
        if (await gh.put('state.json', utf8ToBase64(JSON.stringify(doc)), remoteState && remoteState.sha)) pushed++;
      }

      st.last = Date.now();
      saveState(st);
      return { pulled, pushed };
    } finally {
      running = false;
      if (again) { again = false; setTimeout(() => sync(onProgress).catch(() => {}), 500); }
    }
  }

  root.CODI_SYNC = {
    sync,
    lastSynced: () => loadState().last || 0,
    reset: () => localStorage.removeItem(STATE_KEY),
    DEFAULT_REPO: '790725kjs-bot/codi-data',
  };
})(window);
