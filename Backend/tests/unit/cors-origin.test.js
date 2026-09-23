const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeOrigin, csvOrigins } = require('../../src/core/config/env');

test('CORS origins are normalized without trailing slashes', () => {
  assert.equal(normalizeOrigin('https://trex.farmlink.site/'), 'https://trex.farmlink.site');
  assert.deepEqual(
    csvOrigins('https://trex.farmlink.site/, http://localhost:3001, https://trex.farmlink.site'),
    ['https://trex.farmlink.site', 'http://localhost:3001'],
  );
});
