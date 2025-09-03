export async function onRequest(context) {
  const { request, env, params } = context;
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

    // For now, we'll use the bound R2 bucket if available
    // In the future, we can add support for dynamic buckets
    if (!env.R2_BUCKET) {
      return new Response(JSON.stringify({ 
        error: 'R2 bucket not configured. Please configure R2 bucket binding in Cloudflare Pages settings.',
        info: 'Add R2_BUCKET binding pointing to danger-website-media bucket'
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Handle different routes
    switch (route) {
      case 'test':
        try {
          // Test by listing with 1 item
          await env.R2_BUCKET.list({ limit: 1 });
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'list':
        try {
          const path = url.searchParams.get('path') || '';
          const prefix = path ? path + '/' : '';
          
          console.log('Listing R2 path:', path, 'prefix:', prefix);
          
          const listed = await env.R2_BUCKET.list({
            prefix: prefix,
            delimiter: '/',
            limit: 1000
          });
          
          console.log('R2 list result:', {
            objects: listed.objects?.length || 0,
            prefixes: listed.delimitedPrefixes?.length || 0
          });
          
          const files = [];

          // Add folders (delimited prefixes)
          if (listed.delimitedPrefixes) {
            for (const folderPrefix of listed.delimitedPrefixes) {
              const name = folderPrefix.slice(prefix.length).replace(/\/$/, '');
              if (name && name !== '.keep') {
                files.push({
                  name,
                  path: folderPrefix.replace(/\/$/, ''),
                  isDirectory: true,
                  size: 0,
                  lastModified: new Date().toISOString()
                });
              }
            }
          }

          // Add files
          if (listed.objects) {
            for (const obj of listed.objects) {
              const name = obj.key.slice(prefix.length);
              // Skip files in subdirectories and .keep files
              if (name && !name.includes('/') && !name.endsWith('.keep')) {
                files.push({
                  name,
                  path: obj.key,
                  isDirectory: false,
                  size: obj.size,
                  lastModified: obj.uploaded.toISOString()
                });
              }
            }
          }

          console.log('Returning files:', files.length);
          return new Response(JSON.stringify(files), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('List error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'upload':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        try {
          const uploadPath = url.searchParams.get('path');
          if (!uploadPath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const contentType = request.headers.get('Content-Type') || 'application/octet-stream';
          const body = await request.arrayBuffer();
          
          await env.R2_BUCKET.put(uploadPath, body, {
            httpMetadata: {
              contentType: contentType
            }
          });

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'download':
        try {
          const downloadPath = url.searchParams.get('path');
          if (!downloadPath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const object = await env.R2_BUCKET.get(downloadPath);
          if (!object) {
            return new Response('Not found', { status: 404, headers: corsHeaders });
          }

          const responseHeaders = {
            ...corsHeaders,
            'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
          };

          return new Response(object.body, { headers: responseHeaders });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'delete':
        if (request.method !== 'DELETE') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        try {
          const deletePath = url.searchParams.get('path');
          if (!deletePath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // For folders, we need to delete all contents
          if (deletePath.endsWith('/') || url.searchParams.get('isFolder') === 'true') {
            const folderPath = deletePath.endsWith('/') ? deletePath : deletePath + '/';
            const objects = await env.R2_BUCKET.list({ prefix: folderPath });
            
            // Delete all objects in the folder
            for (const obj of objects.objects || []) {
              await env.R2_BUCKET.delete(obj.key);
            }
          } else {
            // Delete single file
            await env.R2_BUCKET.delete(deletePath);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'create-folder':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405, headers: corsHeaders });
        }

        try {
          const folderPath = url.searchParams.get('path');
          if (!folderPath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          // Create a .keep file to make the folder exist
          await env.R2_BUCKET.put(folderPath + '/.keep', '');
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      default:
        return new Response('Not found', { status: 404, headers: corsHeaders });
    }
  } catch (error) {
    console.error('R2 API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}