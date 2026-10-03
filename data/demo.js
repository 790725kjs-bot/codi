// 미리 보기용 예시 옷장. 주소 끝에 #demo 를 붙여 열면, 옷장이 비어 있을 때만 채워진다.
window.CODI_DEMO = function () {
  const list = [
    ['shirt', 'white'], ['shirt', 'blue'], ['knit', 'navy'], ['thinknit', 'ivory'], ['knit', 'charcoal'],
    ['tee', 'white'], ['tee', 'black'], ['longsleeve', 'gray'], ['sweatshirt', 'gray'], ['hoodie', 'navy'],
    ['polo', 'navy'], ['denimshirt', 'middenim'],
    ['cardigan', 'black'], ['blazer', 'navy'], ['cottonjacket', 'beige'], ['ziphoodie', 'gray'],
    ['leather', 'black'], ['coat', 'charcoal'], ['lightpadding', 'black'], ['thincardigan', 'navy'],
    ['slacks', 'black'], ['slacks', 'gray'], ['chino', 'beige'], ['jeans', 'darkdenim'], ['jeans', 'middenim'],
    ['sweatpants', 'gray'], ['sweatpants', 'black'], ['shorts', 'beige'],
    ['sneakers', 'white'], ['derby', 'black'], ['loafer', 'brown'], ['running', 'gray'],
    ['watch', 'black'], ['muffler', 'gray'], ['cap', 'navy'], ['belt', 'brown'],
  ];
  const C = window.CODI_CATALOG;
  return list.map(([type, color], i) => ({
    id: `demo${i}`, cat: C.type[type].cat, type, color,
    uses: C.type[type].uses.slice(), status: 'ok', name: '', photo: null, added: '2026-10-03',
  }));
};
