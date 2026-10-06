/** Public GET endpoint; the server runtime is the sole epoch authority. */
export function handle(request, response) {
  if (request.method === 'OPTIONS') {
    response.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.set('Access-Control-Allow-Origin', '*');
    response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    response.set('Vary', 'Origin');
    return response.status(204).send('');
  }
  if (request.method !== 'GET') {
    return response.status(405).set('Allow', 'GET').send('Method not allowed');
  }
  response.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.set('Pragma', 'no-cache');
  response.set('Content-Type', 'application/json; charset=utf-8');
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.set('Vary', 'Origin');
  return response.status(200).json({ epochMs: Date.now() });
}
