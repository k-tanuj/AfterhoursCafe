import server from '../dist/server/server.js';

async function handler(request, context) {
  let req = request;
  try {
    const originalPath = request.headers.get('x-invoke-path') || new URL(request.url).pathname;
    // Remove the /api/index prefix if it was rewritten incorrectly by Vercel
    const cleanPath = originalPath.startsWith('/api/index') ? originalPath.replace('/api/index', '') || '/' : originalPath;
    
    const url = new URL(request.url);
    const newUrl = new URL(cleanPath + url.search, url.origin);
    req = new Request(newUrl.href, request);
  } catch (e) {
    // fallback if URL parsing fails
  }
  // Pass the request to the fetch handler exported by TanStack Start
  return server.default ? server.default.fetch(req, process.env, context) : server.fetch(req, process.env, context);
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
export const OPTIONS = handler;
export const HEAD = handler;
