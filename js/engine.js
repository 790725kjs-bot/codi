// 코디 추천 엔진. 화면과 무관하게 동작하며 Node에서도 테스트할 수 있다.
(function (root) {
  const C = root.CODI_CATALOG;
  const R = root.CODI_RULES;

  const MARGIN = 2; // 권장 기온에서 이만큼 벗어나도 감점하고 허용
  const RAIN_PROB = 60;
  const BIG_SWING = 10; // 일교차
  const LAYER_MAX = 11; // 이 기온 이하에서만 아우터를 겹쳐 입는 조합을 만든다 (채널: 9~11℃부터 두꺼운 아우터)
  const LAYER_BONUS = 3; // 안쪽에 하나 더 입으면 겉옷이 이만큼 덜 춥게 느껴진다고 본다

  const isNeutral = (color) => !!(C.color[color] && C.color[color].neutral);
  const colorName = (color) => (C.color[color] ? C.color[color].name : color);

  // 권장 기온 범위 안이면 0, 살짝 벗어나면 1, 많이 벗어나면 null
  function fit(range, t) {
    if (!range) return 0;
    if (t >= range[0] && t <= range[1]) return 0;
    if (t >= range[0] - MARGIN && t <= range[1] + MARGIN) return 1;
    return null;
  }

  // 사용자가 "이 날씨엔 덥다/춥다"고 한 옷의 기온 한계 { 옷 id: { max, min } } (추천을 만들 때 채운다)
  let limits = {};

  function tempFit(item, role, t) {
    const rule = R.temp[item.type];
    const lim = limits[item.id];
    let range = rule && (rule[role] || rule.wear);
    if (!range && !lim) return 0;
    range = range || [-99, 99];
    if (lim) range = [Math.max(range[0], lim.min == null ? -99 : lim.min), Math.min(range[1], lim.max == null ? 99 : lim.max)];
    return fit(range, t);
  }

  function inList(table, key, value) {
    return !!(table && table[key] && table[key].includes(value));
  }

  // 두 색의 궁합 점수. 채널 규칙에 있으면 가산, 무채색이 끼면 무난, 유채색끼리 규칙에 없으면 감점
  function pairScore(table, key, value, label, src, reasons, issues) {
    if (inList(table, key, value)) {
      reasons.push({ text: label, src });
      return 3;
    }
    if (key === value) return isNeutral(key) ? 0.5 : -1;
    if (isNeutral(key) || isNeutral(value)) return 1;
    issues.push({ kind: 'color', text: `${label}: 채널 조합표에 없는 유채색끼리의 조합`, src });
    return -3;
  }

  function trioHit(colors) {
    const set = new Set(colors);
    return R.trios.find((trio) => trio.colors.every((c) => set.has(c)));
  }

  function scoreCombo(combo, ctx) {
    const { top, mid, outer, bottom, shoes } = combo;
    const outermost = outer || mid;   // 가장 겉에 보이는 옷
    const overTop = mid || outer;     // 상의 바로 위에 닿는 옷
    const { theme, weather, profile, feedback, today } = ctx;
    const reasons = [], issues = [];
    let score = 0;

    score += pairScore(R.topByBottom, bottom.color, top.color,
      `${colorName(bottom.color)} 하의에 ${colorName(top.color)} 상의`, R.src.topBottom, reasons, issues);
    if (outermost) {
      score += pairScore(R.bottomByOuter, outermost.color, bottom.color,
        `${colorName(outermost.color)} 아우터에 ${colorName(bottom.color)} 하의`, R.src.outerBottom, reasons, issues);
      const what = overTop === mid ? '이너 아우터' : '아우터';
      if (overTop.color === top.color) {
        score -= 1.5;
        issues.push({ kind: 'minor', text: `${what}와 상의가 같은 ${colorName(top.color)}이라 밋밋할 수 있음` });
      } else if (!isNeutral(overTop.color) && !isNeutral(top.color)) {
        score -= 2;
        issues.push({ kind: 'color', text: `${what}(${colorName(overTop.color)})와 상의(${colorName(top.color)})가 모두 유채색` });
      }
    }
    if (mid && outer) {
      if (mid.color === outer.color && !isNeutral(mid.color)) score -= 1;
      else if (!isNeutral(mid.color) && !isNeutral(outer.color)) {
        score -= 2;
        issues.push({ kind: 'color', text: `겹쳐 입은 두 겉옷(${colorName(mid.color)}, ${colorName(outer.color)})이 모두 유채색` });
      }
    }
    if (shoes) {
      score += pairScore(R.shoesByBottom, bottom.color, shoes.color,
        `${colorName(bottom.color)} 바지에 ${colorName(shoes.color)} 신발`, R.src.bottomShoes, reasons, issues);
    }

    if (R.avoid.some(([t, b]) => t === top.color && b === bottom.color)) {
      score -= 3;
      issues.push({ kind: 'color', text: `${colorName(top.color)} 상의에 ${colorName(bottom.color)} 하의는 채널이 애매하다고 한 조합`, src: v('QP8eNqOfNzo') });
    }

    const worn = [top, mid, outer, bottom].filter(Boolean).map((x) => x.color);
    const trio = trioHit(worn.concat(shoes ? [shoes.color] : []));
    if (trio) {
      score += 4;
      reasons.push({ text: `${trio.colors.length}색 꿀조합: ${trio.colors.map(colorName).join(' + ')}`, src: trio.src });
    }
    if (new Set(worn).size > 3) {
      score -= 2;
      issues.push({ kind: 'color', text: '옷 색이 3가지를 넘음 (채널은 3색 안쪽 조합을 권함)', src: R.src.trio });
    }

    // 옷 종류 조합
    const has = (list, item) => (list == null ? !item : !!item && list.includes(item.type));
    // 조합표의 '아우터' 칸은 가디건처럼 이너 아우터에 속한 옷도 들어 있어 두 겹 중 하나만 맞으면 된다
    const layer = (list) => (list == null ? !outer && !mid : [outer, mid].some((x) => x && list.includes(x.type)));
    // mid 칸이 있는 조합표는 겹쳐 입기 조합: 겉옷과 이너 아우터가 각각 맞아야 한다
    const outfit = R.outfits.find((f) => (f.mid ? has(f.outer, outer) && has(f.mid, mid) : layer(f.outer)) && has(f.top, top) && has(f.bottom, bottom)
      && (!shoes || has(f.shoes, shoes)));
    if (outfit) {
      score += 2.5;
      reasons.push({ text: `채널 ${outfit.src.title}에 나온 옷 구성`, src: outfit.src });
    } else {
      const coat = [outer, mid].find((x) => x && inList(R.bottomTypeByOuter, x.type, bottom.type));
      if (coat) {
        score += 1.5;
        reasons.push({ text: `${C.type[coat.type].name}에는 ${C.type[bottom.type].name}`, src: R.src.outerBottomType });
      }
    }

    // 피부톤에 맞는 상의 색
    const skin = R.skin[profile.skin];
    if (skin) {
      const face = outermost && !skin.good.includes(top.color) ? outermost : top;
      if (skin.good.includes(face.color)) {
        score += 1.5;
        reasons.push({ text: `${skin.name}에 잘 받는 ${colorName(face.color)}`, src: R.src.skin });
      } else if (skin.avoid.includes(top.color)) score -= 1.5;
    }

    // 주제와 격식
    const parts = [top, mid, outer, bottom, shoes].filter(Boolean);
    const formal = parts.map((x) => C.type[x.type].formal);
    if (theme === 'out') {
      if (Math.max(...formal) - Math.min(...formal) >= 2) {
        score -= 4;
        const dressy = parts.find((x) => C.type[x.type].formal === 2), loose = parts.find((x) => C.type[x.type].formal === 0);
        issues.push({ kind: 'formal', text: `격식 차이가 큰 옷이 섞임 (${C.type[dressy.type].name} + ${C.type[loose.type].name})` });
      }
      const want = profile.style === 'casual' ? 1 : 2;
      const weight = profile.style === 'both' ? 0.4 : 0.8;
      score += weight * formal.filter((f) => f === want || (profile.style === 'both' && f >= 1)).length;
    } else {
      score += formal.filter((f) => f === 0).length;
      score -= 2 * formal.filter((f) => f === 2).length;
    }

    // 날씨
    const fits = [combo.topFit, combo.midFit, combo.outerFit, combo.bottomFit, combo.shoesFit].filter((f) => f != null);
    score -= 2 * fits.reduce((a, b) => a + b, 0);
    if (fits.some((f) => f > 0)) combo.note = '권장 기온에서 조금 벗어난 옷 포함';
    if (weather.swing >= BIG_SWING && outermost) score += 1.5;
    // 채널 온도별 옷차림: 5~8℃는 아우터를 겹쳐 입는 구간
    if (mid && outer && weather.feel != null && weather.feel <= 8) {
      score += 1;
      reasons.push({ text: '추운 날 아우터 겹쳐 입기 (채널 5~8℃ 권장)', src: R.src.temp });
    } else if (mid && outer) score -= 1.5; // 아직 덜 추운 날엔 한 겹을 기본으로 둔다
    if (weather.rainProb >= RAIN_PROB) {
      if (shoes && shoes.type === 'rainboots') score += 3;
      if (shoes && ['white', 'ivory', 'beige'].includes(shoes.color)) {
        score -= 3;
        issues.push({ kind: 'rain', text: '비 예보가 있는 날 밝은색 신발' });
      }
      if (outer && outer.type === 'suede') {
        score -= 6;
        issues.push({ kind: 'rain', text: '비 예보가 있는 날 스웨이드 자켓' });
      }
    } else if (shoes && shoes.type === 'rainboots') score -= 6;
    if (weather.wind >= 30 && outer && outer.type === 'windbreaker') score += 1;

    // 아래는 추천 순위에만 쓰고, 입은 코디를 평가할 때는 쓰지 않는다
    if (!ctx.evaluating) {
      // 최근 3일 안에 입은 옷은 순위를 낮춘다
      for (const part of parts) {
        if (part.lastWorn && daysBetween(part.lastWorn, today) <= 3 && part.cat !== 'shoes') score -= 1.5;
      }

      // 좋아요/싫어요
      const fb = feedback && feedback[`${top.id}|${bottom.id}`];
      if (fb) score += fb > 0 ? 2 : -8;

      // 조합에서 빼 달라고 한 아이템과 그 사유
      score += dislikePenalty(combo, ctx.dislikes);

      // 직접 입고 남긴 선호
      const prefs = ctx.prefs;
      if (prefs) {
        const pair = prefs.pairs[`${top.id}|${bottom.id}`];
        if (pair) {
          score += pair.delta;
          if (pair.delta > 0) reasons.push({ text: pair.guideOk ? '직접 입고 선호한 조합 (채널 가이드와도 부합)' : '직접 입고 선호한 조합' });
        }
        score += prefs.colors[`${top.color}|${bottom.color}`] || 0;
      }
    }

    return { score, reasons, issues };
  }

  const v = (id) => ({ url: `https://www.youtube.com/shorts/${id}` });

  // 권장 기온에서 벗어난 정도를 문장으로 만든다
  function tempIssue(item, role, t, shown = t) {
    const rule = R.temp[item.type];
    const range = rule && (rule[role] || rule.wear);
    if (!range || (t >= range[0] && t <= range[1])) return null;
    const hot = t > range[1];
    const far = hot ? t - range[1] > MARGIN : range[0] - t > MARGIN;
    const where = role === 'solo' ? ' 단독' : role === 'inner' ? ' (아우터 안)' : role === 'under' ? ' (아우터 안에 겹쳐)' : '';
    return {
      kind: 'temp', level: far ? 2 : 1, src: R.src.temp,
      text: `체감 ${shown}℃에 ${C.type[item.type].name}${where}: ${far ? '' : '조금 '}${hot ? '더울' : '추울'} 수 있음 (권장 ${Math.max(range[0], -10)}~${Math.min(range[1], 35)}℃)`,
    };
  }

  // 실제로 입은 조합을 채널 가이드로 평가한다. parts: { top, bottom, outer?, shoes? }
  function evaluate(parts, ctx) {
    const { top, bottom, mid, outer, shoes } = parts;
    const t = ctx.weather && ctx.weather.feel != null ? ctx.weather.feel : null;
    const weather = ctx.weather || { feel: null, swing: 0, rainProb: 0, wind: 0 };
    const tempIssues = [];
    if (t != null) {
      const checks = [[top, mid || outer ? 'inner' : 'solo', t], [mid, outer ? 'under' : 'wear', t],
        [outer, 'wear', mid ? t + LAYER_BONUS : t], [bottom, 'wear', t], [shoes, 'wear', t]];
      for (const [item, role, tt] of checks) {
        const issue = item && tempIssue(item, role, tt, t);
        if (issue) tempIssues.push(issue);
      }
      const need = R.temp[top.type] && R.temp[top.type].solo;
      if (!outer && !mid && need && t < need[0] - MARGIN) {
        tempIssues[tempIssues.length - 1].text += ' — 겉옷을 걸치면 맞습니다';
      }
    }
    const combo = { top, bottom, mid: mid || null, outer: outer || null, shoes: shoes || null };
    const result = scoreCombo(combo, { ...ctx, weather, evaluating: true });
    const score = result.score - tempIssues.reduce((sum, i) => sum + 2 * i.level, 0);
    const issues = result.issues.concat(tempIssues);
    const guideOk = result.reasons.length > 0 && !issues.some((i) => i.kind === 'color' || i.kind === 'formal');
    return { score, reasons: result.reasons, issues, guideOk };
  }

  // 한 벌만 바꿔서 더 나아지는 경우를 찾는다
  function suggestSwaps(parts, ctx, items) {
    const base = evaluate(parts, ctx);
    const out = [];
    for (const role of ['top', 'mid', 'outer', 'bottom', 'shoes']) {
      const current = parts[role];
      if (!current) continue;
      let best = null;
      for (const item of items) {
        if (item.cat !== current.cat || item.id === current.id || item.status === 'store') continue;
        const next = evaluate({ ...parts, [role]: item }, ctx);
        if (next.issues.some((i) => i.kind === 'temp' && i.level === 2)) continue;
        if (!best || next.score > best.score) best = { item, score: next.score };
      }
      if (best && best.score - base.score >= 3) out.push({ role, from: current, to: best.item, gain: best.score - base.score });
    }
    return out.sort((a, b) => b.gain - a.gain).slice(0, 2);
  }

  // 싫어요 사유를 점수로 바꾼다.
  //   색·분위기·핏이 안 맞음 → 그때 함께였던 옷과 다시 묶이면 크게, 같은 색(색 사유)이나
  //                             같은 종류(분위기·핏 사유)의 다른 옷과 묶여도 조금 낮춘다.
  //                             그 옷 자체는 낮추지 않아, 다른 옷과의 조합으로는 계속 나온다
  //   (예전 기록의 '옷 자체가 내키지 않음'만 그 옷이 들어간 모든 조합을 낮춘다)
  //   덥다·춥다 → 점수가 아니라 그 옷을 입는 기온 한계를 좁혀서 반영한다
  const NEAR = { shoes: ['bottom'], top: ['bottom', 'mid', 'outer'], mid: ['top', 'outer', 'bottom'], outer: ['top', 'mid', 'bottom'], bottom: ['top', 'shoes', 'mid', 'outer'] };
  function dislikePenalty(combo, dislikes) {
    if (!dislikes || !dislikes.length) return 0;
    const parts = { top: combo.top, mid: combo.mid, outer: combo.outer, bottom: combo.bottom, shoes: combo.shoes };
    let penalty = 0;
    for (const r of dislikes) {
      const mine = Object.values(parts).find((p) => p && p.id === r.item);
      if (!mine) continue;
      const near = NEAR[mine.cat] || [];
      if (r.reason === 'item') { penalty += 4; continue; }
      if (r.reason === 'hot' || r.reason === 'cold') continue;
      let together = 0, similar = 0;
      for (const w of r.with) {
        const p = Object.values(parts).find((x) => x && x.id === w.id) || parts[w.role];
        if (!p) continue;
        if (p.id === w.id) together++;
        else if (near.includes(p.cat)
          && ((r.reason === 'color' && p.color === w.color) || ((r.reason === 'style' || r.reason === 'fit') && p.type === w.type))) similar++;
      }
      penalty += Math.min(9, together * 5) + Math.min(6, similar * 3);
    }
    return -penalty;
  }

  // 액세서리는 싫다고 한 조합의 옷과 다시 묶지 않는다
  function accBlocked(acc, combo, dislikes) {
    if (!dislikes) return false;
    const ids = [combo.top, combo.mid, combo.outer, combo.bottom, combo.shoes].filter(Boolean).map((x) => x.id);
    return dislikes.some((r) => r.item === acc.id
      && (r.reason === 'item' || r.with.some((w) => ids.includes(w.id))));
  }

  function daysBetween(a, b) {
    return Math.abs((new Date(b) - new Date(a)) / 864e5);
  }

  function pickAccessories(combo, accs, ctx) {
    const { theme, weather } = ctx;
    const colors = [combo.top, combo.mid, combo.outer, combo.bottom, combo.shoes].filter(Boolean).map((x) => x.color);
    const ok = accs.filter((a) => {
      if (tempFit(a, 'wear', weather.feel) !== 0 || accBlocked(a, combo, ctx.dislikes)) return false;
      return isNeutral(a.color) || colors.includes(a.color) || ['brown', 'camel'].includes(a.color);
    });
    const order = theme === 'out'
      ? ['muffler', 'gloves', 'watch', 'belt', 'bracelet', 'bag', 'necklace', 'glasses', 'cap']
      : ['cap', 'muffler', 'bag', 'watch'];
    const picked = [];
    for (const type of order) {
      const found = ok.find((a) => a.type === type);
      if (found) picked.push(found);
      if (picked.length === 2) break;
    }
    return picked;
  }

  // 한 주제의 모든 유효 조합을 점수순으로 만든다
  function buildCombos(items, ctx) {
    const { theme, weather } = ctx;
    const t = weather.feel;
    limits = ctx.tempLimits || {};
    const usable = items.filter((i) => i.status === 'ok' && i.uses.includes(theme));
    const of = (cat) => usable.filter((i) => i.cat === cat);
    const tops = of('top'), bottoms = of('bottom'), outers = of('outer'), mids = of('mid'), accs = of('acc');
    let shoesList = of('shoes').map((s) => ({ s, f: tempFit(s, 'wear', t) })).filter((x) => x.f != null);
    if (!shoesList.length) shoesList = [{ s: null, f: null }];

    const combos = [];
    for (const top of tops) {
      const solo = tempFit(top, 'solo', t);
      const inner = tempFit(top, 'inner', t);
      for (const bottom of bottoms) {
        const bf = tempFit(bottom, 'wear', t);
        if (bf == null) continue;
        for (const { s: shoes, f: sf } of shoesList) {
          const base = { top, bottom, shoes, bottomFit: bf, shoesFit: sf };
          if (solo != null) combos.push({ ...base, outer: null, mid: null, topFit: solo });
          if (inner == null) continue;
          for (const outer of outers) {
            const of_ = tempFit(outer, 'wear', t);
            if (of_ != null) combos.push({ ...base, outer, mid: null, topFit: inner, outerFit: of_ });
          }
          for (const mid of mids) {
            const mf = tempFit(mid, 'wear', t);
            if (mf != null) combos.push({ ...base, outer: null, mid, topFit: inner, midFit: mf });
          }
          // 겹쳐 입기: 안쪽 옷 덕분에 겉옷은 3℃ 덜 춥게 느끼는 것으로 본다 (어플의 판단)
          if (t > LAYER_MAX) continue;
          for (const outer of outers) {
            const of_ = tempFit(outer, 'wear', t + LAYER_BONUS);
            if (of_ == null) continue;
            for (const mid of mids) {
              const mf = tempFit(mid, 'under', t);
              if (mf != null) combos.push({ ...base, outer, mid, topFit: inner, outerFit: of_, midFit: mf });
            }
          }
        }
      }
    }
    for (const combo of combos) {
      Object.assign(combo, scoreCombo(combo, ctx));
      combo.accs = pickAccessories(combo, accs, ctx);
    }
    return combos.filter((c) => c.score > R.minScore).sort((a, b) => b.score - a.score);
  }

  // 상의와 하의가 서로 겹치지 않는 조합을 고른다. 한 벌이 빨래 중이어도 나머지가 남게 하기 위함.
  function pickDiverse(combos, max) {
    const picks = [];
    const usedTop = new Set(), usedBottom = new Set(), usedOuter = new Set();
    for (const c of combos) {
      if (usedTop.has(c.top.id) || usedBottom.has(c.bottom.id)) continue;
      if (c.outer && usedOuter.has(c.outer.id) && combos.some((o) => o.outer && !usedOuter.has(o.outer.id)
        && !usedTop.has(o.top.id) && !usedBottom.has(o.bottom.id) && o.score >= c.score - 3)) continue;
      picks.push(c);
      usedTop.add(c.top.id); usedBottom.add(c.bottom.id);
      if (c.outer) usedOuter.add(c.outer.id);
      if (picks.length === max) break;
    }
    const strict = picks.length;
    // 옷이 적어 완전히 다른 조합이 모자라면 상의만 다른 조합으로 채운다
    if (picks.length < max) {
      for (const c of combos) {
        if (usedTop.has(c.top.id)) continue;
        picks.push({ ...c, shared: '하의가 다른 조합과 겹칩니다' });
        usedTop.add(c.top.id);
        if (picks.length === max) break;
      }
    }
    return { picks, strict };
  }

  function recommend(items, ctx, max = 3) {
    const combos = buildCombos(items, ctx);
    const { picks, strict } = pickDiverse(combos, max);
    return { picks, strict, total: combos.length };
  }

  // 채널 기본템 중 내 옷장에 없는 것을 하나씩 가상으로 넣어 보고, 새 조합이 얼마나 늘어나는지로 순위를 매긴다
  function shoppingAdvice(items, ctx, themes) {
    const owned = (e) => items.some((i) => i.type === e.type && i.color === e.color && i.status !== 'store');
    const base = {};
    for (const theme of themes) base[theme] = recommend(items, { ...ctx, theme });
    const out = [];
    for (const e of R.essentials) {
      if (owned(e)) continue;
      const virtual = {
        id: `virtual-${e.type}-${e.color}`, cat: C.type[e.type].cat, type: e.type, color: e.color,
        status: 'ok', uses: e.uses || C.type[e.type].uses,
      };
      const gains = {};
      let total = 0, strictGain = 0;
      for (const theme of themes) {
        if (!virtual.uses.includes(theme)) continue;
        const r = recommend(items.concat(virtual), { ...ctx, theme });
        gains[theme] = { strict: r.strict - base[theme].strict, total: r.total - base[theme].total };
        total += gains[theme].total;
        strictGain += gains[theme].strict;
      }
      if (total > 0) out.push({ essential: e, gains, total, strictGain });
    }
    out.sort((a, b) => b.strictGain - a.strictGain || b.total - a.total);
    return { base, advice: out };
  }

  // 기온대별로 조합이 몇 개 나오는지 점검한다 (계절을 미리 대비)
  function seasonCheck(items, ctx, themes) {
    return R.bands.map((band) => {
      const weather = { feel: band.mid, swing: 0, rainProb: 0, wind: 0 };
      const row = { band };
      for (const theme of themes) row[theme] = recommend(items, { ...ctx, theme, weather }).strict;
      return row;
    });
  }

  function bandOf(t) {
    return R.bands.find((b) => t >= b.min && t <= b.max) || R.bands[R.bands.length - 1];
  }

  root.CODI_ENGINE = { recommend, shoppingAdvice, seasonCheck, bandOf, evaluate, suggestSwaps, RAIN_PROB, BIG_SWING };
})(typeof window !== 'undefined' ? window : globalThis);
