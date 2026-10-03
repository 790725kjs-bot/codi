// 옷 분류와 색상 목록. 어플 전체가 이 id를 기준으로 동작한다.
(function (root) {
  const CATS = [
    { id: 'top', name: '상의' },
    { id: 'outer', name: '아우터' },
    { id: 'bottom', name: '하의' },
    { id: 'shoes', name: '신발' },
    { id: 'acc', name: '액세서리' },
  ];

  // formal: 0 편안함, 1 캐주얼, 2 댄디
  // uses: 처음 등록할 때 기본으로 체크되는 용도 (out 외출용, comfy 편안한 복장)
  const TYPES = [
    { id: 'tee', cat: 'top', name: '반팔티', formal: 1, uses: ['out', 'comfy'] },
    { id: 'sshirt', cat: 'top', name: '반팔셔츠', formal: 1, uses: ['out'] },
    { id: 'sknit', cat: 'top', name: '반팔니트', formal: 2, uses: ['out'] },
    { id: 'polo', cat: 'top', name: '카라티(폴로)', formal: 2, uses: ['out'] },
    { id: 'longsleeve', cat: 'top', name: '롱슬리브', formal: 1, uses: ['out', 'comfy'] },
    { id: 'shirt', cat: 'top', name: '셔츠', formal: 2, uses: ['out'] },
    { id: 'denimshirt', cat: 'top', name: '데님셔츠', formal: 1, uses: ['out'] },
    { id: 'thinknit', cat: 'top', name: '얇은 니트', formal: 2, uses: ['out'] },
    { id: 'knit', cat: 'top', name: '니트', formal: 2, uses: ['out'] },
    { id: 'sweatshirt', cat: 'top', name: '맨투맨', formal: 1, uses: ['out', 'comfy'] },
    { id: 'hoodie', cat: 'top', name: '후드티', formal: 0, uses: ['out', 'comfy'] },

    { id: 'thincardigan', cat: 'outer', name: '얇은 가디건', formal: 2, uses: ['out', 'comfy'] },
    { id: 'thinzip', cat: 'outer', name: '얇은 후드집업', formal: 0, uses: ['out', 'comfy'] },
    { id: 'cardigan', cat: 'outer', name: '가디건', formal: 2, uses: ['out', 'comfy'] },
    { id: 'ziphoodie', cat: 'outer', name: '후드집업', formal: 0, uses: ['out', 'comfy'] },
    { id: 'windbreaker', cat: 'outer', name: '바람막이', formal: 0, uses: ['out', 'comfy'] },
    { id: 'tracktop', cat: 'outer', name: '트랙탑', formal: 0, uses: ['out', 'comfy'] },
    { id: 'denimjacket', cat: 'outer', name: '데님자켓', formal: 1, uses: ['out'] },
    { id: 'cottonjacket', cat: 'outer', name: '면자켓(워크자켓)', formal: 1, uses: ['out'] },
    { id: 'blazer', cat: 'outer', name: '블레이저', formal: 2, uses: ['out'] },
    { id: 'fishtail', cat: 'outer', name: '피시테일', formal: 1, uses: ['out'] },
    { id: 'leather', cat: 'outer', name: '레더자켓', formal: 2, uses: ['out'] },
    { id: 'suede', cat: 'outer', name: '스웨이드자켓', formal: 2, uses: ['out'] },
    { id: 'ma1', cat: 'outer', name: '항공점퍼', formal: 1, uses: ['out'] },
    { id: 'fleece', cat: 'outer', name: '플리스', formal: 0, uses: ['out', 'comfy'] },
    { id: 'wooljacket', cat: 'outer', name: '울자켓(블루종)', formal: 2, uses: ['out'] },
    { id: 'lightpadding', cat: 'outer', name: '경량패딩', formal: 1, uses: ['out', 'comfy'] },
    { id: 'coat', cat: 'outer', name: '코트', formal: 2, uses: ['out'] },
    { id: 'padding', cat: 'outer', name: '패딩', formal: 1, uses: ['out', 'comfy'] },

    { id: 'slacks', cat: 'bottom', name: '슬랙스', formal: 2, uses: ['out'] },
    { id: 'chino', cat: 'bottom', name: '치노(면바지)', formal: 1, uses: ['out'] },
    { id: 'jeans', cat: 'bottom', name: '청바지', formal: 1, uses: ['out', 'comfy'] },
    { id: 'sweatpants', cat: 'bottom', name: '스웻팬츠(츄리닝)', formal: 0, uses: ['comfy'] },
    { id: 'shorts', cat: 'bottom', name: '반바지(버뮤다)', formal: 0, uses: ['out', 'comfy'] },

    { id: 'sneakers', cat: 'shoes', name: '스니커즈', formal: 1, uses: ['out', 'comfy'] },
    { id: 'derby', cat: 'shoes', name: '더비슈즈(구두)', formal: 2, uses: ['out'] },
    { id: 'loafer', cat: 'shoes', name: '로퍼', formal: 2, uses: ['out'] },
    { id: 'running', cat: 'shoes', name: '러닝화', formal: 0, uses: ['comfy'] },
    { id: 'boots', cat: 'shoes', name: '부츠', formal: 1, uses: ['out'] },
    { id: 'sandals', cat: 'shoes', name: '샌들(슬리퍼)', formal: 0, uses: ['comfy'] },
    { id: 'rainboots', cat: 'shoes', name: '레인부츠', formal: 1, uses: ['out', 'comfy'] },

    { id: 'watch', cat: 'acc', name: '시계', formal: 2, uses: ['out'] },
    { id: 'bracelet', cat: 'acc', name: '팔찌', formal: 1, uses: ['out'] },
    { id: 'necklace', cat: 'acc', name: '목걸이', formal: 1, uses: ['out'] },
    { id: 'muffler', cat: 'acc', name: '머플러', formal: 2, uses: ['out'] },
    { id: 'cap', cat: 'acc', name: '모자', formal: 0, uses: ['out', 'comfy'] },
    { id: 'bag', cat: 'acc', name: '가방', formal: 1, uses: ['out'] },
    { id: 'belt', cat: 'acc', name: '벨트', formal: 2, uses: ['out'] },
    { id: 'glasses', cat: 'acc', name: '안경·선글라스', formal: 1, uses: ['out'] },
  ];

  // neutral: 어떤 색과도 무난하게 어울리는 무채색 계열
  const COLORS = [
    { id: 'black', name: '블랙', hex: '#1c1c1c', neutral: true },
    { id: 'white', name: '화이트', hex: '#ffffff', neutral: true },
    { id: 'ivory', name: '아이보리', hex: '#f1e9d6', neutral: true },
    { id: 'gray', name: '그레이', hex: '#a3a3a3', neutral: true },
    { id: 'charcoal', name: '차콜', hex: '#45474b', neutral: true },
    { id: 'navy', name: '네이비', hex: '#1f2a44', neutral: true },
    { id: 'beige', name: '베이지', hex: '#d8c3a0' },
    { id: 'brown', name: '브라운', hex: '#6b4a32' },
    { id: 'camel', name: '카멜', hex: '#b98a52' },
    { id: 'khaki', name: '카키·올리브', hex: '#5e6340' },
    { id: 'lightdenim', name: '연청', hex: '#a9c1dc' },
    { id: 'middenim', name: '중청', hex: '#5f82ad' },
    { id: 'darkdenim', name: '진청', hex: '#2c3e5e' },
    { id: 'blue', name: '블루·스카이', hex: '#7fb0e0' },
    { id: 'burgundy', name: '버건디', hex: '#6d1f2c' },
    { id: 'red', name: '레드', hex: '#c8362e' },
    { id: 'green', name: '그린', hex: '#2f6b45' },
    { id: 'mint', name: '민트', hex: '#a8dcc8' },
    { id: 'yellow', name: '옐로우', hex: '#e8c94a' },
    { id: 'pink', name: '핑크', hex: '#eeb5c0' },
    { id: 'orange', name: '오렌지', hex: '#e07b2e' },
    { id: 'purple', name: '퍼플', hex: '#6f4c8f' },
  ];

  const byId = (list) => Object.fromEntries(list.map((x) => [x.id, x]));

  root.CODI_CATALOG = {
    CATS,
    TYPES,
    COLORS,
    cat: byId(CATS),
    type: byId(TYPES),
    color: byId(COLORS),
    THEMES: [
      { id: 'out', name: '외출용' },
      { id: 'comfy', name: '편안한 복장' },
    ],
  };
})(typeof window !== 'undefined' ? window : globalThis);
