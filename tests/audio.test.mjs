import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeAudio, resampleLinear, audioToMono, hasVoice, splitIntoChunks, formatTime } from '../public/audio-utils.js';
import { MODELS, getModel } from '../public/model-registry.js';

test('three model selections map to public repositories', () => {
  assert.equal(MODELS.length, 3);
  for (const model of MODELS) assert.match(model.model, /^onnx-community\//);
  assert.equal(getModel('turbo-q8').dtype.decoder_model_merged, 'int8');
});
test('merges consecutive buffers', () => {
  assert.deepEqual([...mergeAudio([new Float32Array([1, 2]), new Float32Array([3])])], [1, 2, 3]);
});
test('resampling respects sample count', () => {
  assert.equal(resampleLinear(new Float32Array(48000), 48000).length, 16000);
});
test('mono averages channels', () => {
  const mono = audioToMono({ numberOfChannels: 2, length: 2, getChannelData: i => new Float32Array(i ? [0, 1] : [1, 0]) });
  assert.deepEqual([...mono], [0.5, 0.5]);
});
test('detects silence and voice and chunks', () => {
  assert.equal(hasVoice(new Float32Array(500)), false);
  assert.equal(hasVoice(new Float32Array(500).fill(0.1)), true);
  assert.equal(splitIntoChunks(new Float32Array(16001), 1).length, 2);
  assert.equal(formatTime(65), '01:05');
});
