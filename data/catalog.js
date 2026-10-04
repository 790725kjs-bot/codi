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
  // desc: 종류를 고를 때 이름 옆에 보이는 설명. 어디에 넣을지 헷갈리는 옷을 적어 둔다.
  const TYPES = [
    { id: 'tee', cat: 'top', name: '반팔티', desc: '카라 없는 반팔 티셔츠 (라운드넥, 헨리넥)', formal: 1, uses: ['out', 'comfy'] },
    { id: 'polo', cat: 'top', name: '반팔 카라티', desc: '카라 있는 반팔 티 (폴로, 피케)', formal: 2, uses: ['out'] },
    { id: 'sshirt', cat: 'top', name: '반팔셔츠', desc: '앞단추를 끝까지 여닫는 반팔 셔츠', formal: 1, uses: ['out'] },
    { id: 'sknit', cat: 'top', name: '반팔니트', desc: '니트 짜임의 반팔 (카라 있는 반팔 니트 포함)', formal: 2, uses: ['out'] },
    { id: 'longsleeve', cat: 'top', name: '긴팔티', desc: '카라 없는 얇은 긴팔 티셔츠 (롱슬리브)', formal: 1, uses: ['out', 'comfy'] },
    { id: 'lpolo', cat: 'top', name: '긴팔 카라티', desc: '카라 있는 긴팔 티 (긴팔 폴로, 럭비티)', formal: 2, uses: ['out'] },
    { id: 'shirt', cat: 'top', name: '긴팔셔츠', desc: '앞단추 긴팔 셔츠 (옥스포드, 체크, 린넨)', formal: 2, uses: ['out'] },
    { id: 'denimshirt', cat: 'top', name: '데님셔츠', desc: '청 원단으로 만든 셔츠', formal: 1, uses: ['out'] },
    { id: 'thinknit', cat: 'top', name: '얇은 니트', desc: '봄가을용 얇은 긴팔 니트 (얇은 목폴라 포함)', formal: 2, uses: ['out'] },
    { id: 'knit', cat: 'top', name: '두꺼운 니트', desc: '겨울용 도톰한 니트, 스웨터, 목폴라', formal: 2, uses: ['out'] },
    { id: 'sweatshirt', cat: 'top', name: '맨투맨', desc: '모자 없는 스웻셔츠', formal: 1, uses: ['out', 'comfy'] },
    { id: 'hoodie', cat: 'top', name: '후드티', desc: '모자 달린 스웻셔츠 (지퍼 없음)', formal: 0, uses: ['out', 'comfy'] },
    { id: 'sleeveless', cat: 'top', name: '민소매', desc: '나시, 소매 없는 티', formal: 0, uses: ['comfy'] },

    { id: 'thincardigan', cat: 'outer', name: '얇은 가디건', desc: '여름·초가을용 얇은 가디건', formal: 2, uses: ['out', 'comfy'] },
    { id: 'cardigan', cat: 'outer', name: '가디건', desc: '봄가을용 가디건, 니트 집업', formal: 2, uses: ['out', 'comfy'] },
    { id: 'vest', cat: 'outer', name: '조끼', desc: '니트 조끼, 패딩 조끼 (소매 없는 겉옷)', formal: 1, uses: ['out', 'comfy'] },
    { id: 'thinzip', cat: 'outer', name: '얇은 후드집업', desc: '얇은 원단의 지퍼 후드', formal: 0, uses: ['out', 'comfy'] },
    { id: 'ziphoodie', cat: 'outer', name: '후드집업', desc: '기모·두꺼운 지퍼 후드', formal: 0, uses: ['out', 'comfy'] },
    { id: 'tracktop', cat: 'outer', name: '트랙탑', desc: '운동복 느낌의 지퍼 저지 (츄리닝 상의)', formal: 0, uses: ['out', 'comfy'] },
    { id: 'windbreaker', cat: 'outer', name: '바람막이', desc: '얇은 나일론 점퍼, 아노락', formal: 0, uses: ['out', 'comfy'] },
    { id: 'denimjacket', cat: 'outer', name: '데님자켓', desc: '청자켓 (트러커)', formal: 1, uses: ['out'] },
    { id: 'cottonjacket', cat: 'outer', name: '면자켓', desc: '워크자켓, 셔츠자켓, 얇은 면 점퍼·블루종', formal: 1, uses: ['out'] },
    { id: 'blazer', cat: 'outer', name: '블레이저', desc: '정장풍 자켓, 수트 상의', formal: 2, uses: ['out'] },
    { id: 'trench', cat: 'outer', name: '트렌치코트', desc: '봄가을용 얇은 코트 (맥코트 포함)', formal: 2, uses: ['out'] },
    { id: 'fishtail', cat: 'outer', name: '야상', desc: '피시테일, 사파리, 필드자켓', formal: 1, uses: ['out'] },
    { id: 'leather', cat: 'outer', name: '레더자켓', desc: '가죽 자켓 (라이더, 블루종)', formal: 2, uses: ['out'] },
    { id: 'suede', cat: 'outer', name: '스웨이드자켓', desc: '스웨이드(세무) 자켓', formal: 2, uses: ['out'] },
    { id: 'ma1', cat: 'outer', name: '항공점퍼', desc: 'MA-1, 봄버 자켓', formal: 1, uses: ['out'] },
    { id: 'fleece', cat: 'outer', name: '플리스', desc: '후리스, 뽀글이', formal: 0, uses: ['out', 'comfy'] },
    { id: 'wooljacket', cat: 'outer', name: '울자켓', desc: '울 블루종, 해링턴, 도톰한 점퍼', formal: 2, uses: ['out'] },
    { id: 'lightpadding', cat: 'outer', name: '경량패딩', desc: '얇은 패딩, 누빔 자켓', formal: 1, uses: ['out', 'comfy'] },
    { id: 'coat', cat: 'outer', name: '코트', desc: '겨울용 울 코트 (싱글, 더블, 발마칸)', formal: 2, uses: ['out'] },
    { id: 'padding', cat: 'outer', name: '패딩', desc: '두꺼운 패딩, 무스탕 등 한겨울 외투', formal: 1, uses: ['out', 'comfy'] },

    { id: 'slacks', cat: 'bottom', name: '슬랙스', desc: '정장풍 바지 (린넨·쿨링 슬랙스 포함)', formal: 2, uses: ['out'] },
    { id: 'chino', cat: 'bottom', name: '면바지', desc: '치노, 코듀로이(골덴) 바지', formal: 1, uses: ['out'] },
    { id: 'jeans', cat: 'bottom', name: '청바지', desc: '데님 바지 (색은 연청·중청·진청·블랙에서 고름)', formal: 1, uses: ['out', 'comfy'] },
    { id: 'cargo', cat: 'bottom', name: '카고·나일론 바지', desc: '주머니 달린 카고, 나일론·파라슈트 바지', formal: 1, uses: ['out', 'comfy'] },
    { id: 'sweatpants', cat: 'bottom', name: '츄리닝 바지', desc: '스웻팬츠, 조거, 트레이닝 바지', formal: 0, uses: ['comfy'] },
    { id: 'shorts', cat: 'bottom', name: '반바지', desc: '버뮤다, 데님·면·트레이닝 반바지', formal: 0, uses: ['out', 'comfy'] },

    { id: 'sneakers', cat: 'shoes', name: '스니커즈', desc: '평소 신는 운동화, 캔버스화, 슬립온', formal: 1, uses: ['out', 'comfy'] },
    { id: 'running', cat: 'shoes', name: '러닝화', desc: '쿠션 두꺼운 운동용 신발', formal: 0, uses: ['comfy'] },
    { id: 'derby', cat: 'shoes', name: '구두', desc: '끈 묶는 구두 (더비, 옥스포드)', formal: 2, uses: ['out'] },
    { id: 'loafer', cat: 'shoes', name: '로퍼', desc: '끈 없는 구두, 보트슈즈, 모카신', formal: 2, uses: ['out'] },
    { id: 'boots', cat: 'shoes', name: '부츠', desc: '첼시부츠, 워커, 발목 위로 오는 신발', formal: 1, uses: ['out'] },
    { id: 'sandals', cat: 'shoes', name: '샌들·슬리퍼', desc: '샌들, 슬리퍼, 쪼리, 크록스', formal: 0, uses: ['comfy'] },
    { id: 'rainboots', cat: 'shoes', name: '레인부츠', desc: '비 오는 날 신는 장화', formal: 1, uses: ['out', 'comfy'] },

    { id: 'watch', cat: 'acc', name: '시계', desc: '손목시계', formal: 2, uses: ['out'] },
    { id: 'belt', cat: 'acc', name: '벨트', desc: '허리띠', formal: 2, uses: ['out'] },
    { id: 'tie', cat: 'acc', name: '넥타이', desc: '넥타이, 보타이', formal: 2, uses: ['out'] },
    { id: 'bracelet', cat: 'acc', name: '팔찌·반지', desc: '팔찌, 반지', formal: 1, uses: ['out'] },
    { id: 'necklace', cat: 'acc', name: '목걸이', desc: '목걸이', formal: 1, uses: ['out'] },
    { id: 'muffler', cat: 'acc', name: '머플러', desc: '목도리, 스카프', formal: 2, uses: ['out'] },
    { id: 'gloves', cat: 'acc', name: '장갑', desc: '겨울 장갑', formal: 1, uses: ['out'] },
    { id: 'cap', cat: 'acc', name: '모자', desc: '볼캡, 비니, 버킷햇', formal: 0, uses: ['out', 'comfy'] },
    { id: 'bag', cat: 'acc', name: '가방', desc: '백팩, 크로스백, 토트백', formal: 1, uses: ['out'] },
    { id: 'glasses', cat: 'acc', name: '안경·선글라스', desc: '안경, 선글라스', formal: 1, uses: ['out'] },
    { id: 'socks', cat: 'acc', name: '양말', desc: '색이나 무늬로 포인트를 주는 양말', formal: 1, uses: ['out', 'comfy'] },
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
