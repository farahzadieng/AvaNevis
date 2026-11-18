import { getModel } from './model-registry.js';

let transcriber = null;
let currentId = null;
let isBusy = false;
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
        let device = data.preferredDevice === 'webgpu' && !!self.navigator?.gpu ? 'webgpu' : 'wasm';
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
      notify('ready', { modelId: currentId });
    } catch (e) {
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
      const result = await transcriber(audio, {
        language: 'persian',
        task: 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: false
      });
      notify('result', { id: data.id, text: (result?.text || '').trim() });
    } catch (e) {
      notify('job-error', { id: data.id, message: stringifyError(e) });
    } finally { isBusy = false; }
  }
};
