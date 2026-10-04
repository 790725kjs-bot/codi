// 사진 배경 정리. 배경을 지우고 연한 아이보리로 채운다.
// 공개 모델(RMBG-1.4)을 이 기기 안에서 돌리므로 사진이 밖으로 나가지 않고 요금도 없다.
// 처음 쓸 때 모델 파일(수십 MB)을 한 번 내려받는다.
(function (root) {
  const CDN = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3';
  const MODEL = 'briaai/RMBG-1.4';
  const IVORY = [251, 245, 230];
  let ready;

  function load(onProgress = () => {}) {
    if (!ready) {
      ready = (async () => {
        const T = await import(CDN);
        T.env.allowLocalModels = false;
        const progress = (p) => {
          if (p.status === 'progress' && p.file && p.file.endsWith('.onnx')) onProgress(`배경 정리 준비 중 ${Math.round(p.progress)}%`);
        };
        const model = await T.AutoModel.from_pretrained(MODEL, { config: { model_type: 'custom' }, progress_callback: progress });
        const processor = await T.AutoProcessor.from_pretrained(MODEL, {
          config: {
            do_normalize: true, do_pad: false, do_rescale: true, do_resize: true,
            image_mean: [0.5, 0.5, 0.5], image_std: [1, 1, 1], feature_extractor_type: 'ImageFeatureExtractor',
            resample: 2, rescale_factor: 1 / 255, size: { width: 1024, height: 1024 },
          },
        });
        return { T, model, processor };
      })();
      ready.catch(() => { ready = null; });
    }
    return ready;
  }

  // 모델이 신발 안쪽(밝은 깔창 등)을 배경으로 잘못 보는 경우를 바로잡는다. 신발 사진에만 쓴다.
  // 사진 가장자리와 이어진 배경만 진짜 배경으로 보고, 신발에 둘러싸인 영역은 색이 바깥 배경과
  // 다르면 신발의 일부로 되살린다. 옷에는 쓰지 않는다: 소매와 몸통 사이로 보이는 바닥까지 되살아나기 때문.
  // 반환: 되살린 영역 수
  function restoreInside(mask, px, w, h) {
    const LOW = 128, SIMILAR = 60, MIN_AREA = 150;
    const seen = new Uint8Array(w * h);
    const stack = new Int32Array(w * h);
    const flood = (start, each) => {
      let top = 0;
      stack[top++] = start; seen[start] = 1;
      while (top) {
        const p = stack[--top];
        each(p);
        const x = p % w;
        if (x > 0 && !seen[p - 1] && mask[p - 1] < LOW) { seen[p - 1] = 1; stack[top++] = p - 1; }
        if (x < w - 1 && !seen[p + 1] && mask[p + 1] < LOW) { seen[p + 1] = 1; stack[top++] = p + 1; }
        if (p >= w && !seen[p - w] && mask[p - w] < LOW) { seen[p - w] = 1; stack[top++] = p - w; }
        if (p < w * (h - 1) && !seen[p + w] && mask[p + w] < LOW) { seen[p + w] = 1; stack[top++] = p + w; }
      }
    };

    // 1) 가장자리와 이어진 배경의 평균색
    let br = 0, bg = 0, bb = 0, bn = 0;
    const outside = (p) => { br += px[p * 4]; bg += px[p * 4 + 1]; bb += px[p * 4 + 2]; bn++; };
    for (let x = 0; x < w; x++) {
      for (const p of [x, (h - 1) * w + x]) if (!seen[p] && mask[p] < LOW) flood(p, outside);
    }
    for (let y = 0; y < h; y++) {
      for (const p of [y * w, y * w + w - 1]) if (!seen[p] && mask[p] < LOW) flood(p, outside);
    }
    if (!bn) return 0;
    br /= bn; bg /= bn; bb /= bn;

    // 2) 둘러싸인 영역마다 색을 비교해, 배경색과 다르면 물건으로 되살린다
    let restored = 0;
    for (let p = 0; p < w * h; p++) {
      if (seen[p] || mask[p] >= LOW) continue;
      const pixels = [];
      let r = 0, g = 0, b = 0;
      flood(p, (q) => { pixels.push(q); r += px[q * 4]; g += px[q * 4 + 1]; b += px[q * 4 + 2]; });
      const n = pixels.length;
      if (n < MIN_AREA) continue;
      const dist = Math.hypot(r / n - br, g / n - bg, b / n - bb);
      if (dist > SIMILAR) { for (const q of pixels) mask[q] = 255; restored++; }
    }
    return restored;
  }

  // 반환: { blob: 정리된 사진, rgb: 물건 부분의 평균색 [r, g, b] (찾지 못하면 null),
  //         shoeBlob: 신발용으로 안쪽을 되살린 사진 (되살릴 곳이 없으면 null) }
  async function clean(blob, onProgress) {
    const { T, model, processor } = await load(onProgress);
    const image = await T.RawImage.fromBlob(blob);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);
    const w = image.width, h = image.height;

    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(await createImageBitmap(blob), 0, 0, w, h);
    const original = ctx.getImageData(0, 0, w, h);

    // 마스크대로 배경을 아이보리로 칠한 사진을 만든다
    const compose = async (alpha) => {
      const frame = new ImageData(new Uint8ClampedArray(original.data), w, h);
      const px = frame.data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0, m = 0; i < px.length; i += 4, m++) {
        const a = alpha[m] / 255;
        if (a > 0.9) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
        px[i] = px[i] * a + IVORY[0] * (1 - a);
        px[i + 1] = px[i + 1] * a + IVORY[1] * (1 - a);
        px[i + 2] = px[i + 2] * a + IVORY[2] * (1 - a);
      }
      ctx.putImageData(frame, 0, 0);
      const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
      return { blob: out, rgb: n > 200 ? [r / n, g / n, b / n] : null };
    };

    const plain = await compose(mask.data);
    const shoeMask = new Uint8Array(mask.data);
    const shoe = restoreInside(shoeMask, original.data, w, h) ? await compose(shoeMask) : null;
    return { blob: plain.blob, rgb: plain.rgb, shoeBlob: shoe && shoe.blob };
  }

  root.CODI_BG = { clean, load };
})(window);
