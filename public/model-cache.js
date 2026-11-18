import { MODELS } from './model-registry.js';

// Transformers.js caches model responses in CacheStorage. We ONLY touch its
// model entries, never the application shell, microphone data or arbitrary caches.
const STORAGE_KEY = 'avanevis-installed-models-v0.1';
const MODEL_CACHE_PREFIX = /transformers/i;

export function getInstalled() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
  catch { return {}; }
}
export function markInstalled(id) {
  const installed = getInstalled(); installed[id] = true;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(installed));
}
export function unmarkInstalled(id) {
  const installed = getInstalled(); delete installed[id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(installed));
}
export function isModelUrl(url, model) {
  try {
    const parsed = new URL(url);
    // Only provider URLs including an exact model repository path qualify.
    return (parsed.hostname === 'huggingface.co' || parsed.hostname.endsWith('.huggingface.co')) &&
      decodeURIComponent(parsed.pathname).includes('/' + model.model + '/');
  } catch { return false; }
}
export function isVariantWeight(url, model) {
  if (!isModelUrl(url, model)) return false;
  const file = decodeURIComponent(new URL(url).pathname.split('/').at(-1) || '').toLowerCase();
  // ONNX model files have explicit quantization suffixes; tokenizer/config shared.
  const dtype = typeof model.dtype === 'object' ? model.dtype.encoder_model : model.dtype;
  return file.endsWith('.onnx') && (file.includes(`_${dtype}.onnx`) || file.includes(`_${dtype}_`));
}
export function shouldDeleteUrl(url, model, preserveSameRepo) {
  return isModelUrl(url, model) && (!preserveSameRepo || isVariantWeight(url, model));
}

// A localStorage flag is NOT proof that Safari actually kept multi-GB model files.
// We check for both ONNX weights in the Transformer's real browser cache.
export async function inspectCachedWeights(model) {
  if (!model || !('caches' in globalThis)) return { complete: false, files: [], reason: 'cache-unavailable' };
  const dtype = model.dtype.encoder_model;
  const expected = [`encoder_model_${dtype}.onnx`, `decoder_model_merged_${dtype}.onnx`];
  const present = new Set();
  try {
    for (const name of await caches.keys()) {
      if (!MODEL_CACHE_PREFIX.test(name)) continue;
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        if (!isModelUrl(request.url, model)) continue;
        const file = decodeURIComponent(new URL(request.url).pathname.split('/').at(-1) || '');
        if (expected.includes(file)) present.add(file);
      }
    }
  } catch { return { complete: false, files: [...present], reason: 'cache-read-failed' }; }
  return { complete: expected.every(name => present.has(name)), files: [...present], expected };
}
export async function reconcileInstalled() {
  const previous = getInstalled();
  const next = {};
  const audits = {};
  for (const model of MODELS) {
    audits[model.id] = await inspectCachedWeights(model);
    if (audits[model.id].complete) next[model.id] = true;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return { installed: next, audits, previouslyMarked: previous };
}

export async function removeModels(ids, { installed = getInstalled() } = {}) {
  const targets = MODELS.filter(m => ids.includes(m.id));
  if (!targets.length) return { deleted: 0, skipped: 0 };
  if (!('caches' in globalThis)) throw new Error('مرورگر امکان مدیریت CacheStorage را ارائه نمی‌دهد.');
  const names = await caches.keys();
  let deleted = 0, skipped = 0;
  for (const cacheName of names) {
    if (!MODEL_CACHE_PREFIX.test(cacheName)) continue;
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    for (const request of requests) {
      const matching = targets.find(model => isModelUrl(request.url, model));
      if (!matching) continue;
      const hasOtherVariant = MODELS.some(other => !ids.includes(other.id) && !!installed[other.id] && other.model === matching.model);
      if (!shouldDeleteUrl(request.url, matching, hasOtherVariant)) { skipped++; continue; }
      // Weight files belonging to the other variant must stay installed.
      if (hasOtherVariant && !isVariantWeight(request.url, matching)) { skipped++; continue; }
      if (await cache.delete(request)) deleted++;
    }
  }
  targets.forEach(m => unmarkInstalled(m.id));
  return { deleted, skipped };
}
