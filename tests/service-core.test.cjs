const { test } = require('node:test');
const assert = require('node:assert/strict');
const { addMonths, localDate, nextRecordNo, phoneNumber, readRecords } = require('../service-core.js');
test('month-end clamp and leap years without UTC date shift', () => {
  assert.equal(addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(addMonths('2024-02-29', 12), '2025-02-28');
  assert.equal(addMonths('2026-09-27', 24), '2028-09-27');
  assert.equal(localDate(new Date(2026, 9, 9, 0, 1)), '2026-10-09');
});
test('record numbers use maximum suffix, not count', () => {
  assert.equal(nextRecordNo([{recordNo:'WDBF-20261009-001'},{recordNo:'WDBF-20261009-003'}], '2026-10-09'), 'WDBF-20261009-004');
});
test('Malaysia and international WhatsApp numbers', () => {
  for (const value of ['012-345 6789', '+60 12-345 6789', '0060123456789']) assert.equal(phoneNumber(value), '60123456789');
  assert.equal(phoneNumber(''), '');
  assert.throws(() => phoneNumber('invalid'));
});
test('corrupt data must block writes instead of becoming an empty history', () => {
  assert.deepEqual(readRecords(null), []);
  assert.deepEqual(readRecords('[]'), []);
  for (const raw of ['broken', '{}', '[null]', '[{"id":"warranty"}]']) assert.throws(() => readRecords(raw));
});
