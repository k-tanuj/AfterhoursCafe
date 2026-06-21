import server from '../dist/server/server.js';

async function handler(request, context) {
  // Pass the request to the fetch handler exported by TanStack Start
  return server.default ? server.default.fetch(request, process.env, context) : server.fetch(request, process.env, context);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
