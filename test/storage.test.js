import test from 'node:test';
import assert from 'node:assert/strict';
import { freshSave, normalizeSave } from '../src/storage.js';

test('normalizeSave returns a fresh save for malformed input', () => {
  assert.deepEqual(normalizeSave({ dust: 'many', purchases: [] }), freshSave());
});

test('normalizeSave removes unknown purchases and ships', () => {
  const save = freshSave();
  save.dust = 12.9;
  save.purchases = ['hull1', 'unknown-upgrade'];
  save.ships = ['unknown-ship'];
  save.selectedShip = 'unknown-ship';

  const normalized = normalizeSave(save);

  assert.equal(normalized.dust, 12);
  assert.deepEqual(normalized.purchases, ['hull1']);
  assert.deepEqual(normalized.ships, ['vanguard']);
  assert.equal(normalized.selectedShip, 'vanguard');
});
