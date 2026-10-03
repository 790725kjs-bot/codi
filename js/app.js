(function () {
  const C = window.CODI_CATALOG, R = window.CODI_RULES, CH = window.CODI_CHANNEL;
  const E = window.CODI_ENGINE;
  const { DB, loadSettings, saveSettings, exportAll, importAll } = window.CODI_DB;

  const $ = (sel, el = document) => el.querySelector(sel);
  const view = $('#view'), sheet = $('#sheet');
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const today = () => dateStr(new Date());
  const dateStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const videoUrl = (id) => `https://www.youtube.com/shorts/${id}`;
  const STATUS = { ok: '입을 수 있음', wash: '빨래 중', store: '보관 중' };
  const DAY_NAMES = ['오늘', '내일', '모레'];

  const state = {
    tab: 'today', theme: 'out', day: 0,
    items: [], settings: loadSettings(), forecast: null, weatherError: null,
    closetCat: 'all', closetStatus: 'all',
  };
  const photoUrls = new Map();

  // ---------- 공통 ----------
  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function photoUrl(item) {
    if (!item.photo) return null;
    if (!photoUrls.has(item.id)) photoUrls.set(item.id, URL.createObjectURL(item.photo));
    return photoUrls.get(item.id);
  }

  function inkOn(hex) {
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255));
    return lum > 150 ? '#1b1f2a' : '#ffffff';
  }

  function itemLabel(item) {
    return item.name || `${C.color[item.color].name} ${C.type[item.type].name}`;
  }

  function thumb(item) {
    const url = photoUrl(item);
    if (url) return `<img class="thumb" src="${url}" alt="${esc(itemLabel(item))}">`;
    const hex = C.color[item.color].hex;
    return `<div class="thumb" style="background:${hex};color:${inkOn(hex)}">${esc(C.type[item.type].name)}</div>`;
  }

  async function reloadItems() {
    state.items = await DB.all('items');
  }

  async function saveItem(item) {
    await DB.put('items', item);
    photoUrls.delete(item.id);
    await reloadItems();
  }

  // ---------- 날씨 ----------
  async function loadWeather(force) {
    const { lat, lon } = state.settings.place;
    const cacheKey = 'codi-weather';
    try {
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if (cached && cached.lat === lat && cached.lon === lon) {
        state.forecast = cached.days;
        if (!force && Date.now() - cached.at < 60 * 60 * 1000 && cached.date === today()) return;
      }
    } catch (e) { /* 캐시가 깨졌으면 새로 받는다 */ }
    const url = 'https://api.open-meteo.com/v1/forecast'
      + `?latitude=${lat}&longitude=${lon}`
      + '&hourly=apparent_temperature,wind_speed_10m'
      + '&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max'
      + '&timezone=Asia%2FSeoul&forecast_days=3';
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`날씨 서버 응답 ${res.status}`);
      const data = await res.json();
      const days = data.daily.time.map((date, d) => {
        // 낮 활동 시간(9~18시)의 체감온도 평균을 그날의 기준 기온으로 쓴다
        const hours = data.hourly.apparent_temperature.slice(d * 24 + 9, d * 24 + 19);
        const wind = data.hourly.wind_speed_10m.slice(d * 24 + 9, d * 24 + 19);
        const max = data.daily.temperature_2m_max[d], min = data.daily.temperature_2m_min[d];
        return {
          date, max, min,
          feel: Math.round(hours.reduce((a, b) => a + b, 0) / hours.length),
          swing: Math.round(max - min),
          rainProb: data.daily.precipitation_probability_max[d] || 0,
          wind: Math.round(Math.max(...wind)),
        };
      });
      state.forecast = days;
      state.weatherError = null;
      localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), date: today(), lat, lon, days }));
      const log = JSON.parse(localStorage.getItem('codi-weather-log') || '{}');
      log[days[0].date] = days[0];
      const keep = Object.keys(log).sort().slice(-60);
      localStorage.setItem('codi-weather-log', JSON.stringify(Object.fromEntries(keep.map((k) => [k, log[k]]))));
    } catch (e) {
      state.weatherError = e.message || '날씨를 가져오지 못했습니다';
    }
  }

  function currentWeather() {
    if (state.manualTemp != null) return { feel: state.manualTemp, swing: 0, rainProb: 0, wind: 0, manual: true };
    return state.forecast ? state.forecast[state.day] : null;
  }

  function context(theme, weather) {
    return { theme, weather, profile: state.settings.profile, feedback: state.settings.feedback, today: today() };
  }

  // ---------- 오늘 코디 ----------
  function weatherCard(w) {
    if (!w) {
      return `<section class="card"><h2>날씨</h2>
        <p class="muted small">${esc(state.weatherError || '날씨를 불러오는 중입니다…')}</p>
        ${state.weatherError ? `<div class="row" style="margin-top:10px">
          <input id="manual" type="number" inputmode="numeric" placeholder="체감온도 ℃" style="width:120px;padding:9px;border-radius:10px;border:1px solid var(--line);background:var(--bg)">
          <button class="btn" data-act="manual">이 기온으로 보기</button>
          <button class="btn" data-act="reload">다시 시도</button></div>` : ''}
      </section>`;
    }
    const band = E.bandOf(w.feel);
    const notes = [];
    if (w.swing >= E.BIG_SWING) notes.push(`일교차 ${w.swing}℃ — 벗을 수 있는 겉옷을 챙기세요`);
    if (w.rainProb >= E.RAIN_PROB) notes.push(`비 올 확률 ${w.rainProb}% — 밝은색 신발과 스웨이드는 피했습니다`);
    return `<section class="card">
      <div class="weather">
        <div class="temp">${w.feel}°</div>
        <div><strong>${esc(state.settings.place.name)}</strong> <span class="muted small">${w.manual ? '직접 입력한 기온' : `${DAY_NAMES[state.day]} 낮 체감온도`}</span></div>
        <div class="facts">${w.manual ? '' : `<span>최저 ${Math.round(w.min)}° / 최고 ${Math.round(w.max)}°</span><span>비 ${w.rainProb}%</span><span>바람 ${w.wind}km/h</span>`}</div>
      </div>
      <div class="note"><strong>${esc(band.label)}</strong> · ${esc(band.wear)}
        <a class="muted" href="${R.src.temp.url}" target="_blank" rel="noopener">근거 영상</a></div>
      ${notes.map((n) => `<div class="note">${esc(n)}</div>`).join('')}
      ${w.manual ? '<div class="row" style="margin-top:10px"><button class="btn" data-act="reload">실제 날씨로 돌아가기</button></div>' : `
      <div class="seg" style="margin-top:12px">${DAY_NAMES.map((n, i) => `<button data-day="${i}" class="${state.day === i ? 'on' : ''}">${n}</button>`).join('')}</div>`}
    </section>`;
  }

  function comboCard(combo, index) {
    const parts = [combo.top, combo.outer, combo.bottom, combo.shoes, ...combo.accs].filter(Boolean);
    const ids = parts.map((p) => p.id).join(',');
    return `<section class="card combo">
      <div class="head"><h2 style="margin:0">조합 ${index + 1}</h2>
        <span class="small muted">${esc([combo.shared, combo.note].filter(Boolean).join(' · '))}</span></div>
      <div class="pieces">${parts.map((p) => `<button class="piece" data-item="${p.id}">${thumb(p)}
        <span class="cap">${esc(itemLabel(p))}</span></button>`).join('')}</div>
      <ul class="reasons">${combo.reasons.map((r) => `<li>${esc(r.text)}
        ${r.src ? `<a href="${r.src.url}" target="_blank" rel="noopener">근거 영상</a>` : ''}</li>`).join('')}
        ${combo.reasons.length ? '' : '<li>무채색 중심의 무난한 조합</li>'}</ul>
      <div class="actions">
        <button class="btn primary grow" data-wear="${ids}">오늘 이걸 입어요</button>
        <button class="btn" data-fb="1" data-pair="${combo.top.id}|${combo.bottom.id}" aria-label="좋아요">👍</button>
        <button class="btn" data-fb="-1" data-pair="${combo.top.id}|${combo.bottom.id}" aria-label="싫어요">👎</button>
      </div>
    </section>`;
  }

  function renderToday() {
    const w = currentWeather();
    let body = '';
    if (!state.items.length) {
      body = `<section class="card empty"><p>옷장이 비어 있습니다.</p>
        <p class="small" style="margin:6px 0 14px">옷, 신발, 액세서리 사진을 올리면 날씨에 맞는 코디를 제안합니다.</p>
        <button class="btn primary" data-go="closet">옷 등록하러 가기</button></section>`;
    } else if (w) {
      const result = E.recommend(state.items, context(state.theme, w));
      const washing = state.items.filter((i) => i.status === 'wash').length;
      if (result.strict < 2) {
        body += `<div class="banner">${result.picks.length ? `겹치지 않는 조합이 ${result.strict}개뿐입니다.` : '이 날씨에 맞는 조합을 만들 수 없습니다.'}
          ${washing ? `빨래 중인 옷이 ${washing}벌 있습니다.` : ''} 옷이 부족한 부분을 쇼핑 탭에서 확인하세요.
          <div><button class="btn" data-go="shop">부족한 아이템 보기</button></div></div>`;
      }
      body += result.picks.map(comboCard).join('');
    }
    view.innerHTML = `${weatherCard(w)}
      <div class="seg">${C.THEMES.map((t) => `<button data-theme="${t.id}" class="${state.theme === t.id ? 'on' : ''}">${t.name}</button>`).join('')}</div>
      ${body}`;
  }

  // ---------- 옷장 ----------
  function renderCloset() {
    const cats = [{ id: 'all', name: '전체' }, ...C.CATS];
    const statuses = [{ id: 'all', name: '모든 상태' }, { id: 'wash', name: '빨래 중' }, { id: 'store', name: '보관 중' }];
    const list = state.items
      .filter((i) => state.closetCat === 'all' || i.cat === state.closetCat)
      .filter((i) => state.closetStatus === 'all' || i.status === state.closetStatus)
      .sort((a, b) => C.TYPES.findIndex((t) => t.id === a.type) - C.TYPES.findIndex((t) => t.id === b.type));
    const count = (cat) => state.items.filter((i) => cat === 'all' || i.cat === cat).length;
    view.innerHTML = `
      <div class="chips">${cats.map((c) => `<button class="chip ${state.closetCat === c.id ? 'on' : ''}" data-cat="${c.id}">${c.name} ${count(c.id)}</button>`).join('')}</div>
      <div class="chips">${statuses.map((s) => `<button class="chip ${state.closetStatus === s.id ? 'on' : ''}" data-status="${s.id}">${s.name}</button>`).join('')}</div>
      ${list.length ? `<div class="grid">${list.map((i) => `<button class="piece item" data-item="${i.id}">
        ${thumb(i)}${i.status !== 'ok' ? `<span class="badge">${STATUS[i.status]}</span>` : ''}
        <span class="cap">${esc(itemLabel(i))}</span></button>`).join('')}</div>`
    : `<section class="card empty">${state.items.length ? '조건에 맞는 옷이 없습니다.' : '오른쪽 아래 ＋ 버튼으로 옷 사진을 올려 보세요. 여러 장을 한 번에 고를 수 있습니다.'}</section>`}
      <button class="fab" data-act="add" aria-label="옷 추가">＋</button>
      <input id="file" type="file" accept="image/*" multiple hidden>`;
  }

  async function shrinkPhoto(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.82));
    return { blob, color: detectColor(canvas) };
  }

  // 사진 가운데 영역의 평균색과 가장 가까운 색을 고른다. 틀릴 수 있어 저장 전에 고칠 수 있다.
  function detectColor(canvas) {
    const w = canvas.width, h = canvas.height;
    const data = canvas.getContext('2d').getImageData(Math.round(w * 0.35), Math.round(h * 0.35),
      Math.max(1, Math.round(w * 0.3)), Math.max(1, Math.round(h * 0.3))).data;
    let r = 0, g = 0, b = 0;
    const n = data.length / 4;
    for (let i = 0; i < data.length; i += 4) { r += data[i]; g += data[i + 1]; b += data[i + 2]; }
    r /= n; g /= n; b /= n;
    let best = C.COLORS[0], bestDist = Infinity;
    for (const color of C.COLORS) {
      const v = parseInt(color.hex.slice(1), 16);
      const dist = (r - (v >> 16)) ** 2 + (g - ((v >> 8) & 255)) ** 2 + (b - (v & 255)) ** 2;
      if (dist < bestDist) { bestDist = dist; best = color; }
    }
    return best.id;
  }

  function itemForm(item, isNew, queueNote) {
    const types = C.TYPES.filter((t) => t.cat === item.cat);
    const url = photoUrl(item);
    sheet.innerHTML = `<form class="form" method="dialog" id="itemForm">
      <div class="row between"><h2>${isNew ? '옷 등록' : '옷 수정'}</h2><span class="muted small">${esc(queueNote || '')}</span></div>
      ${url ? `<img class="thumb preview" src="${url}" alt="">` : ''}
      <label>분류<select name="cat">${C.CATS.map((c) => `<option value="${c.id}" ${c.id === item.cat ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>
      <label>종류<select name="type">${types.map((t) => `<option value="${t.id}" ${t.id === item.type ? 'selected' : ''}>${t.name}</option>`).join('')}</select></label>
      <label>색상 <span id="colorName">${C.color[item.color].name}${isNew && url ? ' (사진에서 추정, 틀리면 고쳐 주세요)' : ''}</span>
        <div class="swatches">${C.COLORS.map((c) => `<button type="button" class="swatch ${c.id === item.color ? 'on' : ''}" data-color="${c.id}" style="background:${c.hex}" title="${c.name}" aria-label="${c.name}"></button>`).join('')}</div></label>
      <label>용도<div class="checks">${C.THEMES.map((t) => `<label><input type="checkbox" name="uses" value="${t.id}" ${item.uses.includes(t.id) ? 'checked' : ''}>${t.name}</label>`).join('')}</div></label>
      <label>상태<select name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${k === item.status ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      <label>이름 (선택)<input type="text" name="name" value="${esc(item.name || '')}" placeholder="예: 유니클로 옥스포드 셔츠"></label>
      <div class="actions">
        ${isNew ? '' : '<button type="button" class="btn danger" data-act="delete">삭제</button>'}
        <button type="button" class="btn" data-act="cancel">${queueNote ? '건너뛰기' : '취소'}</button>
        <button type="submit" class="btn primary grow">저장</button>
      </div></form>`;
    if (!sheet.open) sheet.showModal();

    return new Promise((resolve) => {
      const form = $('#itemForm');
      form.cat.onchange = () => {
        readForm();
        item.cat = form.cat.value;
        item.type = C.TYPES.find((t) => t.cat === item.cat).id;
        item.uses = C.type[item.type].uses.slice();
        resolve(itemForm(item, isNew, queueNote));
      };
      form.type.onchange = () => {
        item.type = form.type.value;
        if (isNew) { item.uses = C.type[item.type].uses.slice(); readForm(true); resolve(itemForm(item, isNew, queueNote)); }
      };
      const readForm = (keepUses) => {
        if (!keepUses) item.uses = [...form.querySelectorAll('[name=uses]:checked')].map((x) => x.value);
        item.status = form.status.value;
        item.name = form.name.value.trim();
      };
      form.onclick = (e) => {
        const sw = e.target.closest('[data-color]');
        if (sw) {
          item.color = sw.dataset.color;
          form.querySelectorAll('.swatch').forEach((s) => s.classList.toggle('on', s === sw));
          $('#colorName').textContent = C.color[item.color].name;
        }
        const act = e.target.dataset.act;
        if (act === 'cancel') resolve(null);
        if (act === 'delete' && confirm('이 옷을 옷장에서 삭제할까요?')) resolve('delete');
      };
      form.onsubmit = (e) => {
        e.preventDefault();
        item.type = form.type.value;
        readForm();
        if (!item.uses.length) { toast('용도를 하나 이상 골라 주세요'); return; }
        resolve('save');
      };
    });
  }

  function newItem(photo, color) {
    return {
      id: `i${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
      cat: state.closetCat === 'all' ? 'top' : state.closetCat,
      type: C.TYPES.find((t) => t.cat === (state.closetCat === 'all' ? 'top' : state.closetCat)).id,
      color: color || 'black', uses: [], status: 'ok', name: '', photo: photo || null, added: today(),
    };
  }

  async function addFromFiles(files) {
    let saved = 0;
    for (let i = 0; i < files.length; i++) {
      let shrunk;
      try { shrunk = await shrinkPhoto(files[i]); } catch (e) { toast('읽을 수 없는 사진은 건너뜁니다'); continue; }
      const item = newItem(shrunk.blob, shrunk.color);
      item.uses = C.type[item.type].uses.slice();
      const result = await itemForm(item, true, files.length > 1 ? `${i + 1} / ${files.length}` : '');
      if (result === 'save') { await saveItem(item); saved++; }
      else photoUrls.delete(item.id);
    }
    sheet.close();
    if (saved) toast(`${saved}개 등록했습니다`);
    render();
  }

  async function editItem(id) {
    const item = structuredClone(state.items.find((i) => i.id === id));
    if (!item) return;
    const result = await itemForm(item, false);
    sheet.close();
    if (result === 'save') await saveItem(item);
    if (result === 'delete') { await DB.remove('items', id); await reloadItems(); }
    render();
  }

  // 코디 화면에서 옷을 눌렀을 때: 상태만 빠르게 바꾼다
  function quickStatus(id) {
    const item = state.items.find((i) => i.id === id);
    sheet.innerHTML = `<div class="form">
      <div class="row">${photoUrl(item) ? `<img class="thumb" style="width:72px" src="${photoUrl(item)}" alt="">` : ''}
        <div><h2>${esc(itemLabel(item))}</h2><span class="muted small">${STATUS[item.status]}</span></div></div>
      <button class="btn" data-set="wash">빨래 중으로 표시 (다른 조합으로 바꾸기)</button>
      <button class="btn" data-set="store">보관 중으로 표시</button>
      <button class="btn" data-set="edit">정보 수정</button>
      <button class="btn" data-set="close">닫기</button></div>`;
    sheet.showModal();
    sheet.onclick = async (e) => {
      const set = e.target.dataset.set;
      if (!set) return;
      sheet.onclick = null;
      sheet.close();
      if (set === 'edit') return editItem(id);
      if (set === 'wash' || set === 'store') {
        await saveItem({ ...item, status: set });
        toast(`${itemLabel(item)}: ${STATUS[set]}`);
        render();
      }
    };
  }

  async function wear(ids) {
    const parts = ids.map((id) => state.items.find((i) => i.id === id)).filter(Boolean);
    sheet.innerHTML = `<form class="form" method="dialog" id="wearForm">
      <h2>오늘의 코디로 기록합니다</h2>
      <p class="muted small">입고 나서 빨래할 옷을 골라 두면 다음 추천에서 빠집니다.</p>
      <div class="checks" style="flex-direction:column;gap:10px">${parts.filter((p) => p.cat !== 'acc' && p.cat !== 'shoes').map((p) => `<label>
        <input type="checkbox" name="wash" value="${p.id}" ${p.cat === 'top' ? 'checked' : ''}>${esc(itemLabel(p))} → 빨래 중</label>`).join('')}</div>
      <div class="actions"><button type="button" class="btn" data-act="cancel">취소</button>
        <button type="submit" class="btn primary grow">기록하기</button></div></form>`;
    sheet.showModal();
    const form = $('#wearForm');
    form.onclick = (e) => { if (e.target.dataset.act === 'cancel') sheet.close(); };
    form.onsubmit = async (e) => {
      e.preventDefault();
      const wash = new Set([...form.querySelectorAll('[name=wash]:checked')].map((x) => x.value));
      for (const p of parts) await DB.put('items', { ...p, lastWorn: today(), status: wash.has(p.id) ? 'wash' : p.status });
      await DB.put('log', { id: `${today()}-${state.theme}`, date: today(), theme: state.theme, items: ids });
      await reloadItems();
      sheet.close();
      toast('기록했습니다');
      render();
    };
  }

  // ---------- 쇼핑 ----------
  function daysAgo(date) {
    return Math.floor((new Date(today()) - new Date(date)) / 864e5);
  }

  function renderShop() {
    const w = currentWeather() || { feel: 15, swing: 0, rainProb: 0, wind: 0 };
    const themes = C.THEMES.map((t) => t.id);
    const ctx = context('out', w);
    const { base, advice } = E.shoppingAdvice(state.items, ctx, themes);
    const season = E.seasonCheck(state.items, ctx, themes);
    const themeName = (id) => C.THEMES.find((t) => t.id === id).name;
    const short = themes.filter((t) => base[t].strict < 2);
    const tips = R.tips.filter((t) => !t.when || t.when(state.settings.profile));

    const adviceHtml = advice.slice(0, 6).map((a) => {
      const e = a.essential;
      const products = CH.products.filter((p) => p.type === e.type).slice(0, 3);
      const gain = Object.entries(a.gains).filter(([, g]) => g.total > 0)
        .map(([t, g]) => `${themeName(t)} 조합 +${g.total}${g.strict > 0 ? ` (겹치지 않는 조합 +${g.strict})` : ''}`).join(' · ');
      return `<li><div><span class="dot" style="background:${C.color[e.color].hex}"></span><strong>${esc(e.name)}</strong></div>
        <div class="tag gain">${esc(gain)}</div>
        <div class="small muted">${esc(e.why || '')} ${e.src ? `<a href="${e.src.url}" target="_blank" rel="noopener">근거 영상</a>` : ''}</div>
        ${products.length ? `<div class="small" style="margin-top:4px">채널 소개 상품: ${products.map((p) => `<a href="${videoUrl(p.id)}" target="_blank" rel="noopener">${esc(p.name)}</a>`).join(' · ')}</div>` : ''}</li>`;
    }).join('');

    const deals = CH.deals.slice(0, 15).map((d) => {
      const age = daysAgo(d.date);
      return `<li><a href="${videoUrl(d.id)}" target="_blank" rel="noopener"><strong>${esc(d.title)}</strong></a>
        <div class="small muted">${d.date} · ${age <= 14 ? '<span class="tag new">최근</span>' : '<span class="tag">종료됐을 수 있음</span>'}</div></li>`;
    }).join('');

    view.innerHTML = `
      <section class="card"><h2>지금 사면 좋은 것</h2>
        <p class="small muted" style="margin-bottom:10px">${short.length
    ? `${short.map(themeName).join(', ')} 조합이 부족합니다 (기준: 체감 ${w.feel}℃).`
    : `지금 날씨(체감 ${w.feel}℃)에는 조합이 충분합니다. 아래는 더하면 조합이 늘어나는 기본템입니다.`}
          한 벌을 더했을 때 새로 생기는 조합 수가 많은 순서입니다.</p>
        ${adviceHtml ? `<ul class="list">${adviceHtml}</ul>` : '<p class="muted small">채널 기본템을 이미 갖추고 있거나, 옷장에 옷을 더 등록하면 추천이 나옵니다.</p>'}
      </section>
      <section class="card"><h2>기온대별 옷장 점검</h2>
        <p class="small muted" style="margin-bottom:6px">각 기온에서 겹치지 않게 만들 수 있는 조합 수입니다. 2 미만이면 그 계절 옷이 부족합니다.</p>
        <table><tr><th>기온</th><th>권장 옷차림</th>${themes.map((t) => `<th>${themeName(t)}</th>`).join('')}</tr>
        ${season.map((row) => `<tr><td>${esc(row.band.label)}</td><td class="muted">${esc(row.band.wear)}</td>
          ${themes.map((t) => `<td class="num ${row[t] < 2 ? 'low' : ''}">${row[t]}</td>`).join('')}</tr>`).join('')}</table>
      </section>
      ${tips.length ? `<section class="card"><h2>내 체형·나이에 맞는 채널 조언</h2><ul class="list">${tips.map((t) => `<li class="small">${esc(t.text)}
        ${t.src ? `<a class="muted" href="${t.src.url}" target="_blank" rel="noopener">근거 영상</a>` : ''}</li>`).join('')}</ul></section>` : ''}
      <section class="card"><h2>채널의 세일·특가 소식</h2>
        <p class="small muted" style="margin-bottom:10px">${CH.updated} 기준. 가격과 재고는 영상의 고정댓글·프로필 링크에서 직접 확인하세요.</p>
        <ul class="list">${deals}</ul>
      </section>`;
  }

  // ---------- 설정 ----------
  function renderSettings() {
    const p = state.settings.profile;
    const opt = (list, cur) => list.map(([v, n]) => `<option value="${v}" ${v === cur ? 'selected' : ''}>${n}</option>`).join('');
    view.innerHTML = `
      <section class="card"><h2>내 정보</h2>
        <form class="form" id="profileForm">
          <div class="row"><label style="flex:1">키 (cm)<input type="number" name="height" value="${p.height}"></label>
            <label style="flex:1">몸무게 (kg)<input type="number" name="weight" value="${p.weight}"></label>
            <label style="flex:1">나이<input type="number" name="age" value="${p.age}"></label></div>
          <label>피부톤<select name="skin">${opt(Object.entries(R.skin).map(([k, v]) => [k, v.name]), p.skin)}</select></label>
          <label>선호 스타일<select name="style">${opt([['both', '댄디 + 캐주얼'], ['dandy', '댄디 위주'], ['casual', '캐주얼 위주']], p.style)}</select></label>
          <button class="btn primary">저장</button>
        </form></section>
      <section class="card"><h2>날씨 지역</h2>
        <p class="small muted">${esc(state.settings.place.name)} (위도 ${state.settings.place.lat}, 경도 ${state.settings.place.lon}) · Open-Meteo 예보, 어플을 열 때마다 자동 갱신</p>
        <div class="actions"><button class="btn" data-act="reload">지금 날씨 새로 받기</button></div></section>
      <section class="card"><h2>백업</h2>
        <p class="small muted">옷장과 사진은 이 기기에만 저장됩니다. 휴대폰을 바꾸거나 브라우저 데이터를 지우기 전에 백업 파일을 받아 두세요.</p>
        <div class="actions"><button class="btn" data-act="export">백업 파일 받기</button>
          <button class="btn" data-act="import">백업에서 복원</button></div>
        <input id="importFile" type="file" accept="application/json" hidden></section>
      <section class="card"><h2>코디 기준</h2>
        <p class="small muted">유튜브 채널 maison_jenflox 쇼츠 ${CH.count}개를 ${CH.updated}에 수집해 만든 규칙을 씁니다.
          옷 ${state.items.length}벌 등록됨. 이 어플은 AI 유료 호출을 쓰지 않아 추가 요금이 없습니다.</p></section>`;
  }

  // ---------- 라우팅과 이벤트 ----------
  const RENDER = { today: renderToday, closet: renderCloset, shop: renderShop, settings: renderSettings };
  const SUB = { today: '', closet: '사진으로 등록', shop: '부족한 옷과 특가', settings: '' };

  function render() {
    document.querySelectorAll('#tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === state.tab));
    $('#subtitle').textContent = SUB[state.tab];
    RENDER[state.tab]();
  }

  $('#tabs').onclick = (e) => {
    const b = e.target.closest('[data-tab]');
    if (b) { state.tab = b.dataset.tab; render(); window.scrollTo(0, 0); }
  };

  view.addEventListener('click', async (e) => {
    const t = e.target.closest('button, a');
    if (!t || t.tagName === 'A') return;
    const d = t.dataset;
    if (d.theme) { state.theme = d.theme; render(); }
    else if (d.day) { state.day = Number(d.day); render(); }
    else if (d.go) { state.tab = d.go; render(); window.scrollTo(0, 0); }
    else if (d.cat) { state.closetCat = d.cat; render(); }
    else if (d.status) { state.closetStatus = d.status; render(); }
    else if (d.item) { state.tab === 'closet' ? editItem(d.item) : quickStatus(d.item); }
    else if (d.wear) { wear(d.wear.split(',')); }
    else if (d.fb) {
      state.settings.feedback[d.pair] = Number(d.fb);
      saveSettings(state.settings);
      toast(d.fb === '1' ? '이 조합을 더 자주 추천합니다' : '이 조합은 추천하지 않습니다');
      render();
    } else if (d.act === 'add') {
      const input = $('#file');
      input.onchange = () => { if (input.files.length) addFromFiles([...input.files]); };
      input.click();
    } else if (d.act === 'manual') {
      const v = Number($('#manual').value);
      if ($('#manual').value !== '' && !Number.isNaN(v)) { state.manualTemp = v; render(); }
    } else if (d.act === 'reload') {
      state.manualTemp = null;
      await loadWeather(true);
      toast(state.weatherError || '날씨를 새로 받았습니다');
      render();
    } else if (d.act === 'export') {
      const blob = new Blob([JSON.stringify(await exportAll())], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `코디-백업-${today()}.json`; a.click();
    } else if (d.act === 'import') {
      const input = $('#importFile');
      input.onchange = async () => {
        if (!input.files[0] || !confirm('지금 옷장을 지우고 백업 파일의 내용으로 바꿉니다. 계속할까요?')) return;
        try {
          await importAll(JSON.parse(await input.files[0].text()));
          state.settings = loadSettings(); photoUrls.clear(); await reloadItems();
          toast('복원했습니다'); render();
        } catch (err) { toast(`복원 실패: ${err.message}`); }
      };
      input.click();
    }
  });

  view.addEventListener('submit', (e) => {
    if (e.target.id !== 'profileForm') return;
    e.preventDefault();
    const f = e.target;
    Object.assign(state.settings.profile, {
      height: Number(f.height.value), weight: Number(f.weight.value), age: Number(f.age.value),
      skin: f.skin.value, style: f.style.value,
    });
    saveSettings(state.settings);
    toast('저장했습니다');
  });

  sheet.addEventListener('cancel', (e) => e.preventDefault());

  async function start() {
    await reloadItems();
    // 테스트용: 주소 끝에 #demo 를 붙이면 예시 옷장으로 채운다 (옷장이 비어 있을 때만)
    if (location.hash === '#demo' && !state.items.length && window.CODI_DEMO) {
      for (const item of window.CODI_DEMO()) await DB.put('items', item);
      await reloadItems();
    }
    render();
    await loadWeather(false);
    render();
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  start();
})();
