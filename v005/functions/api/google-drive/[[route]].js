export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Google Drive operations require backend server
  // Return informative error for Cloudflare Pages deployment
  return new Response(JSON.stringify({ 
    error: 'Google Drive integration requires a backend server with Google API access. Please run FileUI locally or deploy with full server support.',
    docs: 'https://github.com/yourusername/fileui/docs/google-drive-setup.md'
  }), {
    status: 501,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}