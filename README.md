# آوانویسنویس — Persian Transcribe (v0.1)

A minimal, privacy-first, Persian-only PWA for running Whisper **inside the browser**. UI font: user-supplied AradVF variable WOFF2, weights 800 (headings), 400 (body), 300 (transcript). **The font file is not included in the ZIP; copy your own provided `AradVF(1).woff2` to `public/AradVF.woff2` before deployment.** Palette: `#B0A6DF` and `#F2F1EA`.

## What is included

- Responsive RTL interface (iPhone and desktop), Persian font and rounded pastel design.
- Three Whisper **ONNX** model profiles, loaded from public Hugging Face repositories **without a login**, using Transformers.js 3.8.1 via jsDelivr.
- Transformer.js browser cache for model weights; no application-controlled server or uploaded model files.
- Live microphone input through AudioWorklet. It sends short chunks to a dedicated inference worker; output appears progressively (not true word-by-word streaming).
- MP3/WAV file decoding and chunked inference. Text is editable and can be copied.
- No application database, no audio/text history, no login and no server-side speech processing.
- Service worker caches local application shell for repeat visits.
- Ready-to-deploy Cloudflare Workers static-assets configuration.

## Model profiles

| UI selection | Public repository | ONNX dtypes | Notes |
|---|---|---|---|
| Large v3 | `onnx-community/whisper-large-v3-ONNX` | encoder fp16; merged decoder fp16 | high memory usage |
| Turbo FP16 | `onnx-community/whisper-large-v3-turbo` | encoder fp16; merged decoder fp16 | balanced |
| Turbo Q8 | `onnx-community/whisper-large-v3-turbo` | encoder q8; merged decoder q8 | smaller model, not necessarily faster than fp16 on GPU |

**Important:** These are ONNX models, *not* the GGML files of whisper.cpp. Their download sizes differ from GGML weights. Numbers in the UI are approximate and may change depending on model revisions and ancillary assets. The actual inference RAM/GPU memory can be considerably higher than downloaded weights.

## Preview locally

First place your own font at `public/AradVF.woff2`. Use Python 3 and visit <http://localhost:4173>:

```bash
cd persian-transcribe
python3 -m http.server 4173 --directory public
```

> The browser needs internet access to download the Transformers.js runtime from jsDelivr on first load and the weights from Hugging Face. HTTPS or localhost is required for the microphone. Model files may be multiple GB. This is NOT a demo/mock interface: clicking a model starts an actual runtime load.

## Deploy to Cloudflare Workers

Node.js 20+ recommended. In the project directory:

```bash
npm install
npx wrangler login
npm run deploy
```

Set your own Worker name in `wrangler.jsonc` before deploying. The app consists of static assets and needs no API, KV, R2, D1, paid inference, credentials or backend functions. Cloudflare can serve the site from your `*.workers.dev` domain.

## Limitations and real-device validation

1. **Not device-validated:** Tests run in the creation environment covered JS syntax, audio utilities and model configuration. An actual multi-gigabyte model download, inference, and microphone operation on iPhone 15/Safari, desktop WebGPU and Cloudflare production have **not** been tested. Do not interpret build success as verified cross-device performance.
2. **Safari model performance:** Safari on iOS may limit available GPU memory and execution in background. Large v3 often requires desktop-class resources. Some Safari versions do not expose WebGPU in workers; the fallback WASM execution can be very slow or fail from memory pressure.
3. **Live transcription:** This is *chunked*, near-real-time transcription. A slow device may fall behind, in which case the app limits the queue and explicitly warns that some audio was dropped. For truly continuous word-level real-time transcription, a much smaller model or native iOS engine is typically necessary.
4. **Cache:** Transformers.js `env.useBrowserCache` stores model artifacts under browser cache rules. Browser storage may be evicted; model files may need redownloading. The app does not store transcripts or audio intentionally.
5. **File lengths:** Browser `decodeAudioData` decodes input in memory prior to inference. Very long MP3/WAV files may fail on memory-constrained mobile phones. The 25-second inference chunks limit model inference work but do not avoid initial audio decoding memory.
6. **External dependencies:** The pinned Transformers.js module is loaded from jsDelivr; models are fetched from Hugging Face on demand. A first-time offline installation is not supported, and CDN code cannot be used offline if it wasn't previously cached by the browser. The local app shell can operate offline, but the inference runtime may still need its CDN assets.
7. **Browser support:** Model selection requires WebGPU for preferred performance. A WASM fallback is attempted but is not guaranteed to finish for these large models. HTTPS/localhost permission is needed for microphone and clipboard access.
8. **Performance is not guaranteed:** Q8 does not always outperform FP16 on GPU. Quality and speed vary by device and need benchmarks with Persian speech.

## Tests

```bash
npm run check
```

This runs syntax checks and Node.js unit tests for the audio pipeline and model registry; it does not run real model inference or cross-browser end-to-end testing.

## Technical references

- https://huggingface.co/onnx-community/whisper-large-v3-turbo/tree/main/onnx
- https://huggingface.co/onnx-community/whisper-large-v3-ONNX/tree/main/onnx
- https://huggingface.co/docs/transformers.js/en/guides/webgpu
- https://developers.cloudflare.com/workers/static-assets/


## آیکون و هویت نسخه ۰.۱
- نام اپ و PWA: **آوانویس**، نسخه **۰.۱** (package: `0.1.0`).
- PNG اصلی: `public/icon-source.png`؛ فایل‌های `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `icon-180.png`, `icon-32.png`, `favicon.ico` آماده هستند.
- `manifest.webmanifest` و `index.html` مسیرهای آیکون را تنظیم کرده‌اند. پس از انتشار نسخه جدید، در صورت ماندن آیکون قدیمی، PWA را از صفحه اصلی دستگاه حذف و مجدداً نصب کنید.

## تنظیمات و مدیریت حافظه مدل
دکمه چرخ‌دنده در سربرگ، صفحه **تنظیمات آوانویس** را باز می‌کند. هر مدل دکمه انتخاب/دانلود و (در صورت ثبت تکمیل بارگذاری) دکمه حذف دارد. دکمه «پاک‌کردن همه مدل‌های دانلودشده» هم وجود دارد. حذف، پاسخ‌های مدل را از CacheStorage اختصاصی Transformers.js پاک می‌کند و مدل فعال را از RAM آزاد می‌کند. اگر دو مدل Turbo ذخیره باشند، فایل‌های مشترک تا حذف آخرین نسخه نگه داشته می‌شوند؛ بدین ترتیب حذف مستقل یک مدل، مدل دیگر را خراب نمی‌کند. این فرآیند فایل‌های مدل را حذف می‌کند نه تاریخچه یا متن (که اصولاً ذخیره نمی‌شوند). پاک‌سازی مدل پس از بسته‌شدن همه تب‌های برنامه قابل اطمینان‌تر است؛ مرورگر ممکن است داده‌های مدل را خارج از کنترل برنامه پاک کند.

**محدودیت‌ها:** مدل‌ها از مخزن عمومی Hugging Face در زمان استفاده دانلود می‌شوند؛ بنابراین حتماً اتصال، CORS، سازگاری WebGPU و حافظه دستگاه را روی Safari واقعی ارزیابی کنید. این بسته بنچمارک سخت‌افزاری نیست.

## فونت اختصاصی
فایل فونت همراه بسته منتشر نمی‌شود. برای استفاده از فونت خودتان `AradVF.woff2` را در مسیر `public/AradVF.woff2` قرار دهید. تنظیمات وزن فعلی: نام برند ۹۰۰، عناوین اصلی ۹۰۰، متن معمولی ۴۰۰ و متن رونویسی ۳۰۰.
