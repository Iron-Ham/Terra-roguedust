import { createHash } from 'node:crypto';

const NOTION_VERSION = '2025-09-03';
const MAX_BODY_BYTES = 64 * 1024;
const SAVE_TITLE = 'Save';
const SAVE_VERSION = 'Save version';
const REVISION = 'Revision';
const STATE = 'State';

export default async function handler(request, response) {
  if (request.method !== 'GET' && request.method !== 'PUT') {
    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: 'Method not allowed.' });
  }

  const token = readCapability(request.headers.authorization);
  if (!token) return response.status(401).json({ error: 'A valid save capability is required.' });
  if (!process.env.NOTION_TOKEN || !process.env.NOTION_SAVE_DATA_SOURCE_ID) {
    return response.status(503).json({ error: 'Remote persistence is not configured.' });
  }

  try {
    const body = request.method === 'PUT' ? await readJsonBody(request) : null;
    if (request.method === 'PUT' && !isSaveRequest(body)) {
      return response.status(400).json({ error: 'Invalid save payload.' });
    }

    const saveKey = createHash('sha256').update(token).digest('hex');
    const existing = await findSave(saveKey);

    if (request.method === 'GET') {
      if (!existing) return response.status(404).json({ error: 'Save not found.' });
      return response.status(200).json(existing);
    }

    const currentRevision = existing?.revision ?? 0;
    if (body.baseRevision !== currentRevision) {
      return response.status(409).json({ error: 'Save revision conflict.', revision: currentRevision });
    }

    const revision = currentRevision + 1;
    if (existing) await updateSave(existing.pageId, body.state, revision);
    else await createSave(saveKey, body.state, revision);
    return response.status(200).json({ revision });
  } catch (error) {
    console.error('Notion save persistence failed.', error);
    return response.status(error.statusCode || 500).json({ error: 'Could not persist the save.' });
  }
}

function readCapability(authorization) {
  if (typeof authorization !== 'string' || !authorization.startsWith('Save ')) return null;
  const token = authorization.slice(5);
  return /^[A-Za-z0-9_-]{32,128}$/.test(token) ? token : null;
}

async function readJsonBody(request) {
  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength > MAX_BODY_BYTES) throw Object.assign(new Error('Payload too large.'), { statusCode: 413 });
  if (request.body && typeof request.body === 'object') return request.body;

  let raw = '';
  for await (const chunk of request) {
    raw += chunk;
    if (Buffer.byteLength(raw) > MAX_BODY_BYTES) throw Object.assign(new Error('Payload too large.'), { statusCode: 413 });
  }
  return JSON.parse(raw);
}

function isSaveRequest(body) {
  return body && typeof body === 'object' && Number.isInteger(body.baseRevision) && body.baseRevision >= 0 && isSaveState(body.state);
}

function isSaveState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return false;
  if (!Number.isInteger(state.version) || !Number.isFinite(state.dust)) return false;
  if (!Array.isArray(state.purchases) || !Array.isArray(state.ships)) return false;
  return JSON.stringify(state).length <= MAX_BODY_BYTES;
}

async function findSave(saveKey) {
  const result = await notionRequest(`/v1/data_sources/${process.env.NOTION_SAVE_DATA_SOURCE_ID}/query`, {
    method: 'POST',
    body: JSON.stringify({ filter: { property: SAVE_TITLE, title: { equals: saveKey } }, page_size: 1 }),
  });
  const page = result.results[0];
  if (!page) return null;

  const rawState = (page.properties[STATE]?.rich_text || []).map(part => part.plain_text).join('');
  return {
    pageId: page.id,
    revision: page.properties[REVISION]?.number || 0,
    state: JSON.parse(rawState),
  };
}

function createSave(saveKey, state, revision) {
  return notionRequest('/v1/pages', {
    method: 'POST',
    body: JSON.stringify({
      parent: { type: 'data_source_id', data_source_id: process.env.NOTION_SAVE_DATA_SOURCE_ID },
      properties: saveProperties(saveKey, state, revision),
    }),
  });
}

function updateSave(pageId, state, revision) {
  return notionRequest(`/v1/pages/${pageId}`, {
    method: 'PATCH',
    body: JSON.stringify({ properties: saveProperties(null, state, revision) }),
  });
}

function saveProperties(saveKey, state, revision) {
  const properties = {
    [SAVE_VERSION]: { number: state.version },
    [REVISION]: { number: revision },
    [STATE]: { rich_text: chunkText(JSON.stringify(state)) },
  };
  if (saveKey) properties[SAVE_TITLE] = { title: [{ text: { content: saveKey } }] };
  return properties;
}

function chunkText(value) {
  const chunks = [];
  for (let index = 0; index < value.length; index += 2000) {
    chunks.push({ type: 'text', text: { content: value.slice(index, index + 2000) } });
  }
  return chunks;
}

async function notionRequest(path, init) {
  const response = await fetch(`https://api.notion.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Notion API ${response.status}: ${message}`);
  }
  return response.json();
}
