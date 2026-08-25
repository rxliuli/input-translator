// Imp Credits is live at imp.rxliuli.com. Both dev and production builds
// talk to the real service; for local iteration against the imp-credits
// repo's `wrangler dev` (http://localhost:8787), temporarily swap the
// constant below — because the API base is derived from IMP_ORIGIN, the
// whole connect + translate flow follows along automatically.
export const IMP_ORIGIN = 'https://imp.rxliuli.com'
// export const IMP_ORIGIN = 'http://localhost:8787'

// The connect flow's success page lives under /api/connect/success; the code
// rides only in a meta tag there. This is the only safe entry point for the
// narrowly-matched connect content script (see entrypoints/imp-connect.content.ts).
export const IMP_CONNECT_URL = `${IMP_ORIGIN}/connect?src=input-translator`

// What every metered call is made against. `/api/v1/translate` and
// `/api/v1/me` hang off this. The server owns the model and the prompt, so
// neither `model` nor a per-request base URL is ever persisted on the client
// — only the api key (see lib/settings.ts's `Settings.imp`).
export const IMP_API_BASE = `${IMP_ORIGIN}/api/v1`
