import test from 'node:test';
import assert from 'node:assert/strict';
import { isModelUrl, isVariantWeight, shouldDeleteUrl, removeModels } from '../public/model-cache.js';
import { getModel } from '../public/model-registry.js';

const q8 = getModel('turbo-q8');
const fp16 = getModel('turbo-fp16');
const url = (name) => `https://huggingface.co/onnx-community/whisper-large-v3-turbo/resolve/main/onnx/${name}`;
test('exact repository scope excludes similarly named repos', () => {
  assert.equal(isModelUrl(url('encoder_model_q8.onnx'), q8), true);
  assert.equal(isModelUrl('https://huggingface.co/onnx-community/whisper-large-v3-turbo-other/resolve/main/onnx/encoder_model_q8.onnx', q8), false);
});
test('deletion only removes variant weights when another variant is installed', () => {
  assert.equal(isVariantWeight(url('encoder_model_q8.onnx'), q8), true);
  assert.equal(isVariantWeight(url('encoder_model_fp16.onnx'), q8), false);
  assert.equal(shouldDeleteUrl(url('tokenizer.json'), q8, true), false);
  assert.equal(shouldDeleteUrl(url('encoder_model_q8.onnx'), q8, true), true);
  assert.equal(shouldDeleteUrl(url('tokenizer.json'), q8, false), true);
});
test('removing q8 leaves fp16 weights and shared config, removing all clears model files', async () => {
  const cacheData = new Map([
    [url('encoder_model_q8.onnx'), 1],
    [url('encoder_model_fp16.onnx'), 1],
    [url('tokenizer.json'), 1],
    ['https://other.test/script.js', 1]
  ]);
  const cache = {
    keys: async () => [...cacheData.keys()].map(url => ({ url })),
    delete: async (request) => cacheData.delete(request.url)
  };
  const removed = [];
  globalThis.localStorage = {
    items: new Map(),
    getItem(key) { return this.items.get(key) ?? null; },
    setItem(key, value) { this.items.set(key, value); },
    removeItem(key) { this.items.delete(key); }
  };
  globalThis.caches = { keys: async () => ['avanevis-shell-v0.1', 'transformers-cache'], open: async () => cache };
  localStorage.setItem('avanevis-installed-models-v0.1', JSON.stringify({ 'turbo-q8': true, 'turbo-fp16': true }));
  const first = await removeModels(['turbo-q8']);
  assert.equal(first.deleted, 1);
  assert.equal(cacheData.has(url('encoder_model_fp16.onnx')), true);
  assert.equal(cacheData.has(url('tokenizer.json')), true);
  const second = await removeModels(['turbo-fp16']);
  assert.equal(second.deleted, 2);
  assert.equal(cacheData.has('https://other.test/script.js'), true);
});
