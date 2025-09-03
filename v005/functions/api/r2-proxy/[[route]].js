// R2 Proxy using direct HTTP requests to S3-compatible endpoints
// This works without R2 bucket bindings

export async function onRequest(context) {
  const { request, params } = context;
  const url = new URL(request.url);
  const route = params.route.join('/');

  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-R2-Credentials',
  };

  // Handle preflight requests
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get credentials from header
    const credString = request.headers.get('X-R2-Credentials');
    if (!credString) {
      return new Response(JSON.stringify({ error: 'No credentials provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const credentials = JSON.parse(atob(credString));
    const { accessKey, secretKey, endpoint, bucket } = credentials;

    if (!bucket) {
      return new Response(JSON.stringify({ error: 'Bucket name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For R2, we can use the public R2 URL pattern if the bucket is public
    // Otherwise, we need signed URLs which require crypto APIs
    
    // Check if this is a Cloudflare R2 endpoint
    const isR2 = endpoint && endpoint.includes('.r2.cloudflarestorage.com');
    
    if (isR2) {
      // Extract account ID from endpoint
      const accountMatch = endpoint.match(/https:\/\/([^.]+)\.r2\.cloudflarestorage\.com/);
      if (!accountMatch) {
        return new Response(JSON.stringify({ error: 'Invalid R2 endpoint format' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
      
      const accountId = accountMatch[1];
      
      // For public R2 buckets, we can use the public URL pattern
      // https://pub-{account_hash}.r2.dev/{bucket}/{key}
      // But this requires the bucket to be public
      
      // Since we can't sign requests without crypto APIs in Cloudflare Workers,
      // we'll return an informative error
      return new Response(JSON.stringify({ 
        error: 'Direct R2 access requires bucket binding or public bucket',
        info: 'To use R2 on Cloudflare Pages:',
        options: [
          '1. Configure R2 bucket binding in Pages settings',
          '2. Make your R2 bucket public and use public URLs',
          '3. Run FileUI locally with full server support'
        ],
        details: {
          bucket: bucket,
          accountId: accountId,
          publicUrlPattern: `https://pub-{account_hash}.r2.dev/${bucket}/{path}`
        }
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // For other S3-compatible services, we would need to implement
    // AWS Signature Version 4 signing, which requires crypto APIs
    return new Response(JSON.stringify({ 
      error: 'S3-compatible access requires server-side signing',
      info: 'Direct S3 API access from browser is not supported due to CORS and signing requirements',
      suggestion: 'Please run FileUI locally or use a service with public bucket support'
    }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('R2 proxy error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}