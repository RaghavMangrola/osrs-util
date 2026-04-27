export default {
  async fetch(request, env) {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${env.AUTH_SECRET}`) {
      return new Response('Unauthorized', { status: 401 });
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (request.method === 'POST' && path === '/bank') {
      return handleIngest(request, env);
    }

    if (request.method === 'GET' && path === '/accounts') {
      return handleListAccounts(env);
    }

    if (request.method === 'GET' && path.startsWith('/bank/')) {
      const hash = decodeURIComponent(path.slice(6));
      return handleGetBank(hash, env);
    }

    return new Response('Not found', { status: 404 });
  },
};

async function handleIngest(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { accounts } = body;
  if (!Array.isArray(accounts) || accounts.length === 0) {
    return new Response('Missing accounts array', { status: 400 });
  }

  const index = JSON.parse(await env.BANK_KV.get('accounts') || '{}');
  const now = new Date().toISOString();

  for (const account of accounts) {
    const { hash, name, worldType, snapshotTime, items } = account;
    if (!hash || !Array.isArray(items)) continue;

    await env.BANK_KV.put(`bank:${hash}`, JSON.stringify({
      hash,
      name: name || hash,
      worldType,
      snapshotTime,
      uploadedAt: now,
      items,
    }));

    index[hash] = { name: name || hash, snapshotTime, uploadedAt: now };
  }

  await env.BANK_KV.put('accounts', JSON.stringify(index));

  return new Response(JSON.stringify({ ok: true, upserted: accounts.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleListAccounts(env) {
  const index = await env.BANK_KV.get('accounts');
  return new Response(index || '{}', {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleGetBank(hash, env) {
  const data = await env.BANK_KV.get(`bank:${hash}`);
  if (!data) return new Response('Not found', { status: 404 });
  return new Response(data, {
    headers: { 'Content-Type': 'application/json' },
  });
}
