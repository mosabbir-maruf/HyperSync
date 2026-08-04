export const onRequest = async (context: any) => {
  const requestUrl = new URL(context.request.url);
  
  // The BACKEND_URL environment variable must be set in the Cloudflare Dashboard
  let backendUrlStr = context.env.BACKEND_URL;
  
  if (!backendUrlStr) {
    return new Response("BACKEND_URL environment variable is missing", { status: 500 });
  }

  // Ensure it has a protocol so URL parsing doesn't crash (1006 error)
  if (!backendUrlStr.startsWith("http")) {
    backendUrlStr = "https://" + backendUrlStr;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(backendUrlStr);
  } catch (err) {
    return new Response("Invalid BACKEND_URL format", { status: 500 });
  }
  
  // Replace the domain with the backend domain
  requestUrl.hostname = targetUrl.hostname;
  requestUrl.port = targetUrl.port;
  requestUrl.protocol = targetUrl.protocol;
  
  // Remove the /api prefix from the path before forwarding to the backend
  requestUrl.pathname = requestUrl.pathname.replace(/^\/api/, '');

  // Construct a clean request to ensure Cloudflare doesn't forward a conflicting Host header
  const headers = new Headers(context.request.headers);
  headers.set('Host', targetUrl.hostname);

  const newRequest = new Request(requestUrl.toString(), {
    method: context.request.method,
    headers: headers,
    body: context.request.method !== 'GET' && context.request.method !== 'HEAD' ? context.request.body : undefined,
    redirect: 'manual'
  });

  // Fetch from the actual backend (Cloudflare Pages Functions natively support WebSockets)
  return fetch(newRequest);
};
