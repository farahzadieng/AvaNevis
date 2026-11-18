import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseStartupModel } from '../public/model-startup.js';

test('no downloaded model requires model selection', () => {
  assert.equal(chooseStartupModel({}, 'persian-base'), null);
});
test('restores last used model when present', () => {
  assert.equal(chooseStartupModel({ 'persian-base': true, 'turbo-q8': true }, 'turbo-q8'), 'turbo-q8');
});
test('falls back to another installed model if preferred is gone', () => {
  assert.equal(chooseStartupModel({ 'persian-base': true }, 'turbo-q8'), 'persian-base');
});
test('ignores unknown or false model entries', () => {
  assert.equal(chooseStartupModel({ unknown: true, 'turbo-q8': false }, 'unknown'), null);
});
