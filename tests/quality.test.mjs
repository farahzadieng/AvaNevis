import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectTranscript, shouldProcessAudio, audioMetrics } from '../public/transcription-quality.js';
import { getModel } from '../public/model-registry.js';
test('q8 uses actual INT8 ONNX artifacts', () => {
  assert.equal(getModel('turbo-q8').dtype.encoder_model, 'int8');
  assert.equal(getModel('turbo-q8').dtype.decoder_model_merged, 'int8');
});
test('genuine Persian transcription is retained', () => {
  assert.equal(inspectTranscript('سلام امروز هوا خیلی خوب است.').ok, true);
});
test('runaway output and Latin multilingual hallucination are rejected', () => {
  assert.equal(inspectTranscript('awning'.repeat(300)).ok, false);
  assert.equal(inspectTranscript('whoops finish record drastic heading sono clarify random language').ok, false);
});
test('silence is skipped rather than prompting hallucination', () => {
  assert.equal(shouldProcessAudio(new Float32Array(16000)).ok, false);
});
test('valid audio can enter the inference engine', () => {
  const audio = Float32Array.from({ length: 16000 }, (_, i) => .12 * Math.sin(i / 20));
  assert.equal(shouldProcessAudio(audio).ok, true);
  assert.ok(audioMetrics(audio).rms > .05);
});
