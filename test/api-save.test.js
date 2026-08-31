import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/save.js';
import { freshSave } from '../src/storage.js';

function mockResponse() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test('save API rejects requests without a capability', async () => {
  const response = mockResponse();

  await handler({ method: 'GET', headers: {} }, response);

  assert.equal(response.statusCode, 401);
});

test('save API rejects malformed state before calling Notion', async () => {
  process.env.NOTION_TOKEN = 'test-token';
  process.env.NOTION_SAVE_DATA_SOURCE_ID = 'test-data-source';
  const originalFetch = global.fetch;
  global.fetch = () => {
    throw new Error('Notion should not be called for malformed state.');
  };
  const response = mockResponse();

  try {
    await handler({
      method: 'PUT',
      headers: { authorization: `Save ${'a'.repeat(32)}` },
      body: { baseRevision: 0, state: { dust: 1 } },
    }, response);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(response.statusCode, 400);
});

test('save API creates the first revision in the configured data source', async () => {
  process.env.NOTION_TOKEN = 'test-token';
  process.env.NOTION_SAVE_DATA_SOURCE_ID = 'test-data-source';
  const calls = [];
  const originalFetch = global.fetch;
  global.fetch = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      json: async () => calls.length === 1 ? { results: [] } : { id: 'new-page' },
      text: async () => '',
    };
  };
  const response = mockResponse();

  try {
    await handler({
      method: 'PUT',
      headers: { authorization: `Save ${'a'.repeat(32)}` },
      body: { baseRevision: 0, state: freshSave() },
    }, response);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { revision: 1 });
  assert.equal(calls[0].url, 'https://api.notion.com/v1/data_sources/test-data-source/query');
  assert.equal(calls[1].url, 'https://api.notion.com/v1/pages');
  const createBody = JSON.parse(calls[1].init.body);
  assert.deepEqual(createBody.parent, { type: 'data_source_id', data_source_id: 'test-data-source' });
  assert.equal(createBody.properties.Revision.number, 1);
});

test('save API rejects stale revisions', async () => {
  process.env.NOTION_TOKEN = 'test-token';
  process.env.NOTION_SAVE_DATA_SOURCE_ID = 'test-data-source';
  const originalFetch = global.fetch;
  global.fetch = async () => ({
    ok: true,
    json: async () => ({
      results: [{
        id: 'existing-page',
        properties: {
          State: { rich_text: [{ plain_text: JSON.stringify(freshSave()) }] },
          Revision: { number: 3 },
        },
      }],
    }),
    text: async () => '',
  });
  const response = mockResponse();

  try {
    await handler({
      method: 'PUT',
      headers: { authorization: `Save ${'a'.repeat(32)}` },
      body: { baseRevision: 2, state: freshSave() },
    }, response);
  } finally {
    global.fetch = originalFetch;
  }

  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, { error: 'Save revision conflict.', revision: 3 });
});
