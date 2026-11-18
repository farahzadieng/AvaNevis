import { getModel } from './model-registry.js';
import { inspectTranscript, shouldProcessAudio, audioMetrics } from './transcription-quality.js';

let transcriber = null;
let currentId = null;
let isBusy = false;
let lastDevice = null;
const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';

function notify(type, extra = {}) { self.postMessage({ type, ...extra }); }
function stringifyError(e) { return e?.message || String(e); }

self.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    const config = getModel(data.modelId);
    if (!config) { notify('error', { message: 'مدل انتخاب‌شده معتبر نیست.' }); return; }
    if (isBusy) { notify('error', { message: 'عملیات دیگری در حال انجام است.' }); return; }
    isBusy = true;
    try {
      notify('status', { phase: 'module', text: 'در حال آماده‌سازی موتور هوش مصنوعی…' });
      const { pipeline, env } = await import(TRANSFORMERS_URL);
      env.allowRemoteModels = true;
      env.useBrowserCache = true;
      env.useCustomCache = false;
      // Dispose previous model to avoid holding multiple large Whisper models in memory.
      if (transcriber && currentId !== config.id) {
        await transcriber.dispose?.(); transcriber = null; currentId = null;
      }
      if (!transcriber) {
        notify('status', { phase: 'download', text: 'در حال دانلود و بارگذاری مدل…' });
        // INT8 Whisper exports are the CPU/WASM path; FP16 uses WebGPU when supported.
        let device = config.id === 'turbo-q8' ? 'wasm' : (data.preferredDevice === 'webgpu' && !!self.navigator?.gpu ? 'webgpu' : 'wasm');
        lastDevice = device;
        notify('device', { device });
        transcriber = await pipeline('automatic-speech-recognition', config.model, {
          device,
          dtype: config.dtype,
          progress_callback: (progress) => {
            notify('progress', {
              file: progress.file || '',
              status: progress.status || '',
              progress: Number.isFinite(progress.progress) ? progress.progress : null,
              loaded: progress.loaded || 0,
              total: progress.total || 0
            });
          }
        });
        currentId = config.id;
      }
      notify('ready', { modelId: currentId, device: lastDevice });
    } catch (e) {
      if (transcriber && currentId !== config.id) { try { await transcriber.dispose?.(); } catch {} transcriber = null; currentId = null; }
      notify('error', { message: `بارگذاری مدل انجام نشد: ${stringifyError(e)}` });
    } finally { isBusy = false; }
    return;
  }
  if (data.type === 'transcribe') {
    if (!transcriber) { notify('job-error', { id: data.id, message: 'ابتدا مدل را آماده کنید.' }); return; }
    if (isBusy) { notify('job-error', { id: data.id, message: 'موتور در حال پردازش بخش دیگری است.' }); return; }
    isBusy = true;
    try {
      const audio = new Float32Array(data.audio);
      const soundCheck = shouldProcessAudio(audio);
      if (!soundCheck.ok) {
        notify('result', { id: data.id, text: '', skipped: soundCheck.reason });
        return;
      }
      // Whisper is a multilingual generator. Force Persian rather than auto-detection.
      // A short, independent segment must not continue decoding the previous segment.
      const options = {
        language: 'persian',
        task: 'transcribe',
        return_timestamps: false,
        chunk_length_s: 30,
        stride_length_s: 5,
        condition_on_prev_tokens: false,
        max_new_tokens: 224,
        repetition_penalty: 1.12,
        no_repeat_ngram_size: 4,
      };
      const result = await transcriber(audio, options);
      const inspection = inspectTranscript(result?.text);
      if (!inspection.ok) {
        notify('job-error', { id: data.id,
          message: 'مدل خروجی غیرمعتبر تولید کرد (' + inspection.reason + '). صدای واضح‌تر یا مدل دقیق‌تر را امتحان کنید.',
          diagnostics: { ...audioMetrics(audio), reason: inspection.reason } });
        return;
      }
      notify('result', { id: data.id, text: inspection.text, skipped: inspection.reason === 'empty' });
    } catch (e) {
      notify('job-error', { id: data.id, message: stringifyError(e) });
    } finally { isBusy = false; }
  }
};
