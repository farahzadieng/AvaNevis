# آوانویس — Persian Transcribe (v0.1.1)

A minimal, privacy-first, Persian-only PWA for running Whisper **inside the browser**. UI font: user-supplied AradVF variable WOFF2, weights 800 (headings), 400 (body), 300 (transcript). **The user-supplied font is included in `public/AradVF.woff2` in this updated source package.** Palette: `#B0A6DF` and `#F2F1EA`.

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
| Turbo Q8 | `onnx-community/whisper-large-v3-turbo` | encoder int8; merged decoder int8 | smaller model, not necessarily faster than fp16 on GPU |

**Important:** These are ONNX models, *not* the GGML files of whisper.cpp. Their download sizes differ from GGML weights. Numbers in the UI are approximate and may change depending on model revisions and ancillary assets. The actual inference RAM/GPU memory can be considerably higher than downloaded weights.

## Preview locally

First place your own font at `public/AradVF.woff2`. Use Python 3 and visit <http://localhost:4173>:

```bash
cd persian-transcribe
python3 -m http.server 4173 --directory public
```

> The browser needs internet access to download the Transformers.js runtime from jsDelivr on first load and the weights from Hugging Face. HTTPS or localhost is required for the microphone. Model files may be multiple GB. This is NOT a demo/mock interface: clicking a model starts an actual runtime load.

## Deploy automatically from GitHub (recommended)

**No local `wrangler login`, GitHub Actions, Cloudflare API token in GitHub, or model hosting is needed.** Cloudflare Workers Builds handles deployments when you push to `main`.

1. Upload the **contents** of this project folder to the root of a GitHub repository. `package.json`, `wrangler.jsonc`, and `public/` must be at the repository root.
2. In **Cloudflare Dashboard → Workers & Pages → Create → Import a repository** (the exact label can vary), connect GitHub and select the repository.
3. Set **Production branch** to `main`, **Root directory** to `/`, **Build command** to `npm run build`, **Deploy command** to `npm run deploy`.
4. Ensure the Worker name is **`avanevis`**, matching `wrangler.jsonc`. Confirm and deploy.
5. Later pushes to `main` trigger automated build and deployment; check the **Builds/Deployments** tab for status.

`npm run build` runs the code/unit tests and returns a failing exit code if they fail. All app files are already in `public/`, so there is no separate frontend compilation step. `npm run deploy` runs Wrangler using the static asset configuration under `wrangler.jsonc`. Cloudflare supplies build authentication through its Git integration.

**Font:** For the supplied AradVF typography, place your licensed/user-owned `AradVF.woff2` in `public/` before pushing to the repository. This ZIP deliberately does not redistribute a font file. The CSS provides fallback fonts if it is absent. **Privacy:** the models download from public Hugging Face when the user chooses one, not during GitHub/Cloudflare deployment. Audio/transcripts are not transmitted to Cloudflare by the app.

More detailed instructions and troubleshooting: [`GITHUB_CLOUDFLARE.md`](GITHUB_CLOUDFLARE.md).

### Optional manual deployment

If you ever choose to deploy directly from a development machine, you can still run `npm install`, `npx wrangler login`, and `npm run deploy`. This is **not needed** for Git-connected deployment.

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

## v0.1.1 troubleshooting / known limitations

- Browser inference is **not** guaranteed to run on mobile: Safari may evict cached multi-GB weights or terminate the worker when memory is insufficient. A 100% **file** download is not the same as a ready-to-use model. The UI now reports load status separately.
- Q8 UI option now resolves to the **INT8** ONNX files that actually exist in the public repository. This profile runs on WASM/CPU as a compatibility choice and may be **slow**, especially on iPhone. For FP16, WebGPU is preferred where supported. Neither path is certified on iPhone 15.
- Prior faulty cache flags are re-audited at startup, requiring both matching ONNX weight files. If a model was evicted, the app no longer claims it is installed.
- The transcription worker requests Persian transcription, controls runaway decoding and rejects obviously repetitive or predominantly Latin junk results. This is a safety guard, **not proof of transcription accuracy**. Record clear speech and avoid feeding silence/noise.
- Audio resampling now applies an anti-alias filter for downsampling from microphones.
- To ensure the latest version is loaded after Cloudflare redeployment, close all tabs for the PWA, reopen, and reload. Old model files may need deletion under settings.
- Tests: run `npm run check`. These are code/unit tests; live Hugging Face downloads, full ASR inference, and real iOS Safari are **not** included in the local test suite.
