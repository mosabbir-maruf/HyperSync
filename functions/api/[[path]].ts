export const onRequest: PagesFunction<any> = async (context) => {
  const url = new URL(context.request.url);
  
  // The BACKEND_URL environment variable must be set in the Cloudflare Dashboard
  const backendUrlStr = context.env.BACKEND_URL;
  
  if (!backendUrlStr) {
    return new Response("BACKEND_URL environment variable is missing", { status: 500 });
  }

  const targetUrl = new URL(backendUrlStr);
  
  // Replace the domain with the backend domain
  url.hostname = targetUrl.hostname;
  url.port = targetUrl.port;
  url.protocol = targetUrl.protocol;
  
  // Remove the /api prefix from the path before forwarding to the backend
  url.pathname = url.pathname.replace(/^\/api/, '');

  // Fetch from the actual backend (Cloudflare Pages Functions natively support WebSockets)
  return fetch(url.toString(), context.request);
};
