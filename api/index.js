import server from '../dist/server/server.js';

export default async function (request, context) {
  // Pass the request to the fetch handler exported by TanStack Start
  return server.default ? server.default.fetch(request, process.env, context) : server.fetch(request, process.env, context);
}
