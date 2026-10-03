// 스타일 룰북. 유튜브 채널 maison_jenflox 쇼츠의 자막·설명란·화면에서 옮겨 적은 규칙이다.
// 채널의 색 이름은 어플의 색으로 다음과 같이 맞췄다:
//   크림·오트밀 → 아이보리 / 인디고 → 진청 / 미드 블루 → 중청 / 라이트 블루(바지) → 연청, (상의) → 블루
//   올리브 → 카키 / 흑청·워시드 블랙 → 블랙·차콜 / 브릭·러스트 → 오렌지 / 버터·머스터드 → 옐로우
(function (root) {
  const v = (id, title) => ({ title, url: `https://www.youtube.com/shorts/${id}` });

  const src = {
    temp: v('0L_xbMtyzCs', '온도별 옷차림 정리'),
    temp2: v('Dcvb6VGqxzc', '온도별 옷차림 추천'),
    topBottom: v('TwiOKEUtLGk', '바지컬러별 상의 꿀조합 정리'),
    outerBottom: v('MXQpQ3Gchjk', '아우터 컬러별 필승 하의색조합 정리'),
    outerBottomType: v('Eq1NxUQfqEA', '아우터별 하의 필승 조합'),
    bottomShoes: v('Hi6qDM3Ycys', '바지컬러별 신발 색조합 정리'),
    trio: v('WpX3tC2xn30', '남자코디 3색 꿀조합 정리'),
    skin: v('z5nudcgY8S0', '피부톤별 상하의 색조합'),
    outfit: v('7KQ1QvI2Pz4', '남자코디 필승조합'),
    basics: v('CEbPqyEr8Og', '현시점 남자 나이대별 기본템 총정리'),
    fwBasics: v('HMCgdK7C7uU', '패린이를 탈출시켜줄 코디 기본템'),
    slacks: v('SQPMXJUiYYk', '현시점 남자코디 필살기본템 2가지'),
    pantsShoesFit: v('i0XA3V5zjsE', '바지핏별 신발 필승조합 정리'),
    topPantsFit: v('V7kFA9ab9ds', '상의핏별 바지 추천조합 정리'),
    cardigan: v('IkagJ5uvlzw', '가디건 예쁘게 입는 꿀팁 4가지'),
    tee: v('spyyLTYbdPw', '반팔티 3배 예쁘게 입는 방법'),
  };

  // 옷 종류별 권장 체감온도(℃). solo: 겉옷 없이 입을 때, inner: 겉옷 안에 입을 때, wear: 그 외
  // 근거: 온도별 옷차림 영상 2편 (2026-09-16, 2026-02-28)
  const temp = {
    tee: { solo: [23, 45], inner: [12, 22] },
    sshirt: { solo: [23, 45], inner: [20, 22] },
    sknit: { solo: [23, 45], inner: [20, 22] },
    polo: { solo: [23, 45], inner: [20, 22] },
    longsleeve: { solo: [20, 22], inner: [5, 19] },
    shirt: { solo: [20, 22], inner: [-30, 19] },
    denimshirt: { solo: [20, 22], inner: [5, 19] },
    thinknit: { solo: [17, 22], inner: [5, 16] },
    knit: { solo: [12, 19], inner: [-30, 11] },
    sweatshirt: { solo: [17, 19], inner: [-30, 16] },
    hoodie: { solo: [17, 19], inner: [-30, 16] },

    thincardigan: { wear: [17, 22] },
    thinzip: { wear: [20, 22] },
    cardigan: { wear: [12, 19] },
    ziphoodie: { wear: [17, 19] },
    windbreaker: { wear: [12, 19] },
    tracktop: { wear: [15, 19] },
    denimjacket: { wear: [12, 16] },
    cottonjacket: { wear: [12, 16] },
    blazer: { wear: [12, 16] },
    fishtail: { wear: [9, 16] },
    leather: { wear: [9, 11] },
    suede: { wear: [9, 11] },
    ma1: { wear: [9, 11] },
    fleece: { wear: [9, 11] },
    wooljacket: { wear: [5, 11] },
    lightpadding: { wear: [5, 8] },
    coat: { wear: [-30, 8] },
    padding: { wear: [-30, 4] },

    shorts: { wear: [23, 45] },
    sandals: { wear: [23, 45] },
    boots: { wear: [-30, 16] },
    muffler: { wear: [-30, 8] },
    bracelet: { wear: [20, 45] },
  };

  const bands = [
    { min: 28, max: 99, mid: 30, label: '28℃ 이상', wear: '반팔, 반바지, 린넨' },
    { min: 23, max: 27, mid: 25, label: '23~27℃', wear: '반팔 상의' },
    { min: 20, max: 22, mid: 21, label: '20~22℃', wear: '롱슬리브, 셔츠, 얇은 니트, 얇은 가디건' },
    { min: 17, max: 19, mid: 18, label: '17~19℃', wear: '얇은 니트, 후드티, 맨투맨, 후드집업, 가디건' },
    { min: 12, max: 16, mid: 14, label: '12~16℃', wear: '니트, 데님자켓, 가디건, 면자켓, 블레이저' },
    { min: 9, max: 11, mid: 10, label: '9~11℃', wear: '레더·스웨이드 자켓, 항공점퍼, 플리스, 울자켓' },
    { min: 5, max: 8, mid: 6, label: '5~8℃', wear: '경량패딩, 코트, 울자켓' },
    { min: -99, max: 4, mid: 0, label: '4℃ 이하', wear: '두꺼운 코트, 패딩' },
  ];

  // 바지색 → 어울리는 상의색. 바지컬러별 상의 꿀조합 시리즈, 청바지 컬러별 조합, 색상별 필승 조합 영상을 합쳤다.
  const topByBottom = {
    darkdenim: ['white', 'brown', 'blue', 'khaki', 'red', 'gray', 'burgundy', 'charcoal', 'black', 'green'],
    middenim: ['white', 'gray', 'brown', 'orange', 'green', 'ivory', 'blue', 'red', 'khaki'],
    lightdenim: ['white', 'camel', 'navy', 'yellow', 'red', 'ivory', 'gray', 'pink', 'brown', 'blue'],
    black: ['white', 'gray', 'burgundy', 'blue', 'purple', 'charcoal', 'red', 'green', 'ivory', 'beige', 'brown'],
    charcoal: ['black', 'blue', 'lightdenim', 'gray', 'navy', 'pink', 'purple', 'khaki'],
    gray: ['blue', 'lightdenim', 'middenim', 'white', 'navy', 'charcoal', 'beige', 'black', 'red', 'gray', 'ivory'],
    beige: ['white', 'blue', 'lightdenim', 'navy', 'brown', 'khaki', 'middenim', 'darkdenim', 'burgundy', 'ivory', 'red'],
    ivory: ['black', 'blue', 'lightdenim', 'navy', 'khaki', 'brown', 'gray', 'burgundy', 'middenim', 'beige'],
    brown: ['burgundy', 'khaki', 'navy', 'middenim', 'darkdenim', 'charcoal', 'ivory', 'red', 'black'],
    khaki: ['brown', 'ivory', 'charcoal', 'orange', 'middenim', 'blue', 'lightdenim', 'darkdenim', 'navy', 'khaki'],
    navy: ['beige', 'gray', 'brown', 'white', 'ivory', 'blue', 'charcoal', 'khaki'],
    white: ['navy', 'red'],
  };

  // 채널이 "애매하다"고 한 조합
  const avoid = [['navy', 'black']]; // [상의, 하의]

  // 아우터색 → 어울리는 바지색 (2026-09-29, 2026-03-29 영상이 같은 내용)
  const bottomByOuter = {
    khaki: ['darkdenim'],
    navy: ['gray'],
    darkdenim: ['beige'],
    middenim: ['beige'],
    lightdenim: ['beige'],
    red: ['black'],
    burgundy: ['black'],
    beige: ['brown'],
    brown: ['ivory'],
    ivory: ['lightdenim'],
    purple: ['charcoal'],
    orange: ['middenim'],
  };

  // 아우터 종류 → 어울리는 바지 종류
  const bottomTypeByOuter = {
    denimjacket: ['chino'],
    leather: ['jeans'],
    suede: ['jeans'],
    wooljacket: ['jeans'],
    ma1: ['jeans'],
    tracktop: ['sweatpants'],
    cardigan: ['slacks'],
    thincardigan: ['slacks'],
    fishtail: ['jeans'],
    fleece: ['sweatpants'],
    cottonjacket: ['jeans'],
  };

  // 바지색 → 어울리는 신발색
  const shoesByBottom = {
    brown: ['black', 'gray', 'ivory', 'charcoal', 'beige', 'navy'],
    middenim: ['black', 'gray', 'white', 'camel', 'red', 'orange'],
    darkdenim: ['black', 'gray', 'brown', 'burgundy', 'yellow'],
    khaki: ['black', 'gray', 'charcoal', 'brown', 'camel', 'beige'],
    lightdenim: ['yellow'],
    charcoal: ['gray'],
    beige: ['ivory'],
    gray: ['blue'],
    ivory: ['brown'],
  };

  // 3색 꿀조합. 상의·아우터·하의(·신발)에 세 색이 모두 들어가면 가산
  const t = (id, ...colors) => ({ colors, src: v(id, '3색 꿀조합') });
  const trios = [
    t('43OkC1_ho0c', 'brown', 'burgundy', 'black'),
    t('43OkC1_ho0c', 'darkdenim', 'beige', 'khaki'),
    t('43OkC1_ho0c', 'navy', 'brown', 'ivory'),
    t('F5XyJDu38iE', 'navy', 'ivory', 'brown'),
    t('F5XyJDu38iE', 'gray', 'charcoal', 'burgundy'),
    t('F5XyJDu38iE', 'ivory', 'khaki', 'darkdenim'),
    t('F5XyJDu38iE', 'ivory', 'khaki', 'orange'),
    t('a8XeCZDdVGY', 'navy', 'lightdenim', 'brown'),
    t('a8XeCZDdVGY', 'burgundy', 'black', 'charcoal'),
    t('a8XeCZDdVGY', 'white', 'brown', 'mint'),
    t('a8XeCZDdVGY', 'khaki', 'ivory', 'black'),
    t('LzX-saXhOz4', 'navy', 'gray', 'blue'),
    t('LzX-saXhOz4', 'darkdenim', 'beige', 'khaki'),
    t('LzX-saXhOz4', 'charcoal', 'black', 'purple'),
    t('WpX3tC2xn30', 'darkdenim', 'khaki', 'camel'),
    t('WpX3tC2xn30', 'charcoal', 'middenim', 'brown'),
    t('WpX3tC2xn30', 'white', 'brown', 'burgundy'),
    t('V6clq1lV3SU', 'navy', 'khaki', 'middenim'),
    t('V6clq1lV3SU', 'beige', 'ivory', 'brown'),
    t('V6clq1lV3SU', 'navy', 'beige', 'blue'),
    t('W6oG-lh3EfI', 'white', 'gray', 'blue'),
    t('W6oG-lh3EfI', 'ivory', 'brown', 'blue'),
    t('W6oG-lh3EfI', 'navy', 'beige', 'ivory'),
    t('W6oG-lh3EfI', 'white', 'lightdenim', 'red'),
    t('W6oG-lh3EfI', 'beige', 'brown', 'khaki'),
  ];

  // 옷 종류 조합(필승조합·하객룩·봄코디 영상). 종류가 모두 맞으면 가산
  const o = (id, title, outer, top, bottom, shoes) => ({ outer, top, bottom, shoes, src: v(id, title) });
  const outfits = [
    o('oGqDDWzHG0E', '가을 하객룩', ['cardigan', 'thincardigan'], ['shirt'], ['slacks'], ['derby', 'loafer']),
    o('oGqDDWzHG0E', '가을 하객룩', ['cardigan'], ['denimshirt'], ['jeans'], ['boots', 'derby']),
    o('oGqDDWzHG0E', '가을 하객룩', ['wooljacket'], ['shirt'], ['jeans'], ['derby']),
    o('oGqDDWzHG0E', '가을 하객룩', ['blazer'], ['longsleeve', 'shirt'], ['chino'], ['loafer']),
    o('7wHQ6FRuJiQ', '가을 하객룩', ['wooljacket'], ['knit', 'thinknit'], ['jeans'], ['derby']),
    o('7wHQ6FRuJiQ', '가을 하객룩', ['blazer'], ['shirt'], ['jeans', 'chino'], ['loafer']),
    o('7KQ1QvI2Pz4', '필승조합', ['suede'], ['thinknit', 'knit', 'denimshirt'], ['jeans'], ['derby']),
    o('7KQ1QvI2Pz4', '필승조합', ['leather'], ['knit', 'thinknit'], ['chino', 'jeans'], ['sneakers', 'derby']),
    o('7KQ1QvI2Pz4', '필승조합', ['cardigan', 'thincardigan'], ['shirt'], ['slacks'], ['loafer']),
    o('7KQ1QvI2Pz4', '필승조합', ['denimjacket'], ['shirt'], ['chino'], ['derby', 'sneakers']),
    o('7KQ1QvI2Pz4', '필승조합', ['cottonjacket'], ['shirt'], ['jeans'], ['boots']),
    o('OrNIw9T2KOg', '봄코디 필승조합', ['cardigan', 'thincardigan'], ['shirt'], ['chino'], ['sneakers']),
    o('OrNIw9T2KOg', '봄코디 필승조합', ['ziphoodie', 'thinzip'], ['sweatshirt'], ['jeans'], ['sneakers']),
    o('wzrendJIGhQ', '벚꽃 코디', ['ma1'], ['hoodie'], ['jeans'], ['sneakers']),
    o('wzrendJIGhQ', '벚꽃 코디', ['denimjacket'], ['hoodie'], ['chino'], ['sneakers']),
    o('wzrendJIGhQ', '벚꽃 코디', ['cottonjacket'], ['shirt', 'longsleeve'], ['chino'], ['sneakers']),
    o('MID1zGQmssk', '여름 하객룩', null, ['sknit', 'polo'], ['slacks'], ['derby']),
    o('MID1zGQmssk', '여름 하객룩', null, ['sshirt'], ['slacks', 'chino'], ['loafer', 'derby']),
  ];

  // 피부톤별로 얼굴 가까이에 두면 좋은 상의색 (영상 화면의 19가지 조합에서 옮김)
  const skin = {
    tan: { name: '구릿빛 (가을 웜톤)', good: ['ivory', 'beige', 'camel', 'brown', 'khaki', 'orange', 'yellow', 'red'], avoid: [] },
    spring: { name: '밝고 노란 기 (봄 웜톤)', good: ['ivory', 'beige', 'mint', 'yellow', 'pink', 'green'], avoid: [] },
    summer: { name: '밝고 붉은 기 (여름 쿨톤)', good: ['purple', 'mint', 'pink', 'gray', 'blue', 'lightdenim'], avoid: [] },
    winter: { name: '희거나 어두운 쿨톤 (겨울 쿨톤)', good: ['burgundy', 'green', 'navy', 'blue', 'black', 'white'], avoid: [] },
    none: { name: '반영 안 함', good: [], avoid: [] },
  };

  // 갖춰 두면 좋은 기본템. 종류는 채널의 30대 중후반~40대 이상 추천 목록과 가을·겨울 기본템 영상에서 가져왔고,
  // 색은 채널이 지정하지 않은 경우 가장 무난한 색으로 정했다.
  const e = (type, color, name, why, source) => ({ type, color, name, why, src: source });
  const essentials = [
    e('tee', 'white', '화이트 반팔티 (일반 기장)', '30대 중후반 이상 1순위 상의', src.basics),
    e('polo', 'navy', '네이비 카라티·폴로 니트', '30대 중후반 이상 1순위 상의', src.basics),
    e('sknit', 'ivory', '아이보리 반팔니트', '30대 중후반 이상 1순위 상의, 여름 하객룩에도 사용', src.basics),
    e('shirt', 'white', '화이트 셔츠', '30대 중후반 이상 1순위 상의, 가디건·블레이저 안에 입는 기본', src.basics),
    e('shirt', 'blue', '블루 셔츠', '가디건 안에 겹쳐 입는 기본 셔츠', src.cardigan),
    e('denimshirt', 'middenim', '중청 데님셔츠', '가을·겨울 코디를 살려 주는 이너', src.fwBasics),
    e('thinknit', 'ivory', '아이보리 얇은 니트', '17~22℃ 구간의 기본 상의', src.temp),
    e('knit', 'navy', '네이비 니트', '12~19℃ 구간의 기본 상의, 세탁 가능한 니트 권장', src.fwBasics),
    e('sweatshirt', 'gray', '그레이 맨투맨', '17~19℃ 구간, 편안한 복장의 기본', src.temp),
    e('cardigan', 'black', '블랙 가디건', '가을·겨울 필수 기본템', src.fwBasics),
    e('ziphoodie', 'gray', '그레이 후드집업', '대체불가 기본템 3가지 중 하나', v('fya_2Sq29hQ', '대체불가 가심비 기본템 3신기')),
    e('blazer', 'navy', '네이비 블레이저', '12~16℃ 구간, 하객룩에도 사용', src.temp),
    e('cottonjacket', 'beige', '베이지 면자켓(워크자켓)', '12~16℃ 구간의 기본 아우터', src.temp),
    e('leather', 'black', '블랙 레더자켓', '9~11℃ 구간의 기본 아우터', src.temp),
    e('wooljacket', 'charcoal', '차콜 울자켓(블루종)', '5~11℃ 구간, 하객룩에도 사용', src.temp),
    e('lightpadding', 'black', '블랙 경량패딩', '5~8℃ 구간의 기본 아우터', src.temp),
    e('coat', 'charcoal', '차콜 코트', '8℃ 이하의 기본 아우터, 캐시미어 혼방 권장', src.fwBasics),
    e('padding', 'black', '블랙 패딩', '4℃ 이하의 기본 아우터', src.temp2),
    e('slacks', 'black', '블랙 세미 와이드 슬랙스', '허벅지가 굵어도 다리가 예뻐 보이는 핏', src.slacks),
    e('slacks', 'gray', '그레이 슬랙스', '30대 중후반 이상 1순위 바지', src.basics),
    e('jeans', 'darkdenim', '진청 셀비지 데님', '30대 중후반 이상 1순위 바지', src.basics),
    e('jeans', 'middenim', '중청 세미와이드 데님', '30대 중후반 이상 1순위 바지', src.basics),
    e('chino', 'beige', '베이지 치노팬츠', '30대 중후반 이상 2순위 바지', src.basics),
    e('chino', 'khaki', '올리브 치노팬츠', '30대 중후반 이상 2순위 바지', src.basics),
    e('sweatpants', 'gray', '그레이 스웻팬츠', '편안한 복장의 기본 바지', src.fwBasics),
    e('shorts', 'black', '블랙 버뮤다 팬츠', '30대 중후반 이상 1순위 바지 (여름)', src.basics),
    e('loafer', 'black', '블랙 로퍼', '30대 중후반 이상 1순위 신발', src.basics),
    e('derby', 'black', '블랙 더비슈즈', '30대 중후반 이상 1순위 신발', src.basics),
    e('sneakers', 'black', '검정 스니커즈', '30대 중후반 이상 1순위 신발', src.basics),
    e('sneakers', 'white', '화이트 스니커즈 (에어포스1 올백)', '30대 중후반 이상 2순위 신발', src.basics),
  ];

  const tips = [
    { when: (p) => p.weight / ((p.height / 100) ** 2) >= 25, text: '허벅지가 굵은 체형은 존재감 없는 세미 와이드 핏, 허리 하프 밴딩 슬랙스가 다리를 예뻐 보이게 합니다.', src: src.slacks },
    { when: (p) => p.age >= 35, text: '30대 중후반~40대 이상은 합리적인 가격의 가심비 기본템 위주로 갖춥니다. 1순위 신발은 로퍼, 검정 스니커즈, 더비슈즈입니다.', src: src.basics },
    { when: (p) => p.height >= 178, text: '채널은 상체 4 : 하체 6 비율을 권합니다. 크롭 기장 추천은 운영자 키(168cm) 기준이라, 키가 큰 편이면 일반 기장부터 입어 보고 판단하세요. (뒷부분은 어플의 해석입니다)', src: src.tee },
    { when: (p) => p.skin === 'tan', text: '가을 웜톤에는 오트밀, 카멜, 머스터드, 브릭, 테라코타 상의가 잘 받습니다. 구릿빛 피부를 가을 웜톤으로 본 것은 어플의 해석이니, 다르면 설정에서 바꾸세요.', src: src.skin },
    { text: '바지 핏별 신발: 와이드는 볼륨 있는 스니커즈, 스트레이트는 더비슈즈, 세미 와이드는 발등 낮은 스니커즈, 커브드는 앞코가 올라간 신발.', src: src.pantsShoesFit },
    { text: '상의 핏별 바지: 세미 오버핏 반팔티는 와이드, 레귤러핏 반팔티는 세미 와이드, 오버핏은 버뮤다 팬츠.', src: src.topPantsFit },
    { text: '가디건은 셔츠를 겹쳐 입고 소매를 함께 걷으면 깔끔합니다. 안에 데님셔츠를 넣어 색 포인트를 줘도 좋습니다.', src: src.cardigan },
  ];

  root.CODI_RULES = {
    src, temp, bands, topByBottom, avoid, bottomByOuter, bottomTypeByOuter, shoesByBottom,
    trios, outfits, skin, essentials, tips, minScore: 0,
  };
})(typeof window !== 'undefined' ? window : globalThis);
