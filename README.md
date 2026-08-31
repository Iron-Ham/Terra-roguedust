# Super Roguedust

A spherical Canvas roguelite with persistent progression.

## Development

```sh
npm install
npm run dev
```

Run `npm test` and `npm run build` before shipping.

## Notion-backed saves

The game always writes a validated local cache. When the embed URL includes a
high-entropy `saveToken` URL fragment, the same-origin `/api/save` route becomes the
authoritative store and migrates an existing local save on first use:

```text
https://your-deployment.example/#saveToken=<32-128 character capability>
```

Create a private Notion data source with these exact properties:

| Property | Type |
| --- | --- |
| Save | Title |
| Save version | Number |
| Revision | Number |
| State | Text |

Share it with a Notion integration, then configure the server-only environment
variables in `.env.example` on Vercel. Do not put the Notion token in a
`VITE_` variable or client code.

The save token is a bearer capability. Put it only in a private embed URL, use
at least 32 random URL-safe characters, and rotate it by changing the URL if it
is exposed. Keeping it in the fragment prevents it from appearing in ordinary
HTTP request logs and referrer headers. The server stores only its SHA-256 hash.
Writes are serialized in the client and rejected when their base revision is
stale.

Without `saveToken`, or if remote loading fails, the game remains playable from
the local cache. Sync failures are visible in the in-game toast.
