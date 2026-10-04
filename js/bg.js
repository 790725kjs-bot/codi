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

  // 반환: { blob: 정리된 사진, rgb: 옷 부분의 평균색 [r, g, b] (찾지 못하면 null) }
  async function clean(blob, onProgress) {
    const { T, model, processor } = await load(onProgress);
    const image = await T.RawImage.fromBlob(blob);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });
    const mask = await T.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(image.width, image.height);

    const canvas = document.createElement('canvas');
    canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(await createImageBitmap(blob), 0, 0, image.width, image.height);
    const frame = ctx.getImageData(0, 0, image.width, image.height);
    const px = frame.data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0, m = 0; i < px.length; i += 4, m++) {
      const a = mask.data[m] / 255;
      if (a > 0.9) { r += px[i]; g += px[i + 1]; b += px[i + 2]; n++; }
      px[i] = px[i] * a + IVORY[0] * (1 - a);
      px[i + 1] = px[i + 1] * a + IVORY[1] * (1 - a);
      px[i + 2] = px[i + 2] * a + IVORY[2] * (1 - a);
      px[i + 3] = 255;
    }
    ctx.putImageData(frame, 0, 0);
    const out = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.88));
    return { blob: out, rgb: n > 200 ? [r / n, g / n, b / n] : null };
  }

  root.CODI_BG = { clean, load };
})(window);
