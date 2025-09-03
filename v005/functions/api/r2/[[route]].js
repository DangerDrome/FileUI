// R2 API implementation with corrected AWS Signature V4 signing

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

    if (!bucket) {
      return new Response(JSON.stringify({ error: 'Bucket name required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Helper function to create HMAC
    const hmac = async (key, string) => {
      const cryptoKey = await crypto.subtle.importKey(
        'raw',
        key,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
      return await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(string));
    };

    // Helper to convert ArrayBuffer to hex string
    const toHex = (buffer) => {
      return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    };

    // AWS Signature V4 implementation
    const signRequest = async (method, path, queryParams = {}, headers = {}, body = null) => {
      const now = new Date();
      const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, '');
      const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
      
      const service = 's3';
      const region = 'auto'; // R2 uses 'auto' region
      const algorithm = 'AWS4-HMAC-SHA256';
      const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
      
      // Parse endpoint to get host
      const endpointUrl = new URL(endpoint);
      const host = endpointUrl.hostname;
      
      // Canonical URI - encode URI parts
      const canonicalUri = `/${bucket}${path}`;
      
      // Canonical query string - sort by key
      const canonicalQueryString = Object.keys(queryParams)
        .sort()
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(queryParams[key])}`)
        .join('&');
      
      // Canonical headers - must be lowercase and sorted
      const canonicalHeaders = {
        'host': host,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        'x-amz-date': amzDate,
        ...Object.fromEntries(
          Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])
        )
      };
      
      const signedHeadersList = Object.keys(canonicalHeaders).sort();
      const signedHeaders = signedHeadersList.join(';');
      
      const canonicalHeadersStr = signedHeadersList
        .map(key => `${key}:${canonicalHeaders[key]}`)
        .join('\n') + '\n';
      
      // Create canonical request
      const canonicalRequest = [
        method,
        canonicalUri,
        canonicalQueryString,
        canonicalHeadersStr,
        signedHeaders,
        'UNSIGNED-PAYLOAD'
      ].join('\n');
      
      // Create string to sign
      const hashedCanonicalRequest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(canonicalRequest)
      );
      
      const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        toHex(hashedCanonicalRequest)
      ].join('\n');
      
      // Calculate signing key
      const kDate = await hmac(new TextEncoder().encode('AWS4' + secretKey), dateStamp);
      const kRegion = await hmac(kDate, region);
      const kService = await hmac(kRegion, service);
      const kSigning = await hmac(kService, 'aws4_request');
      
      // Calculate signature
      const signature = await hmac(kSigning, stringToSign);
      const signatureHex = toHex(signature);
      
      // Create authorization header
      const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
      
      // Build final headers
      const finalHeaders = {
        'Host': host,
        'X-Amz-Date': amzDate,
        'X-Amz-Content-SHA256': 'UNSIGNED-PAYLOAD',
        'Authorization': authorizationHeader,
        ...headers
      };
      
      // Build URL with query string
      const finalUrl = `${endpoint}${canonicalUri}${canonicalQueryString ? '?' + canonicalQueryString : ''}`;
      
      return { url: finalUrl, headers: finalHeaders };
    };

    // Handle different routes
    switch (route) {
      case 'test':
        try {
          const { url: signedUrl, headers } = await signRequest('GET', '/', { 'max-keys': '1' });
          const response = await fetch(signedUrl, { headers });
          
          if (response.ok) {
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            const errorText = await response.text();
            console.error('R2 test failed:', errorText);
            return new Response(JSON.stringify({ success: false, error: errorText }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (error) {
          console.error('R2 test error:', error);
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'list':
        try {
          const path = url.searchParams.get('path') || '';
          const prefix = path ? path + '/' : '';
          
          const queryParams = {
            'list-type': '2',
            'prefix': prefix,
            'delimiter': '/',
            'max-keys': '1000'
          };
          
          const { url: signedUrl, headers } = await signRequest('GET', '/', queryParams);
          const response = await fetch(signedUrl, { headers });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('R2 list failed:', errorText);
            throw new Error(`List failed: ${response.status}`);
          }
          
          const xml = await response.text();
          
          // Parse XML response
          const files = [];
          
          // Simple XML parsing for CommonPrefixes (folders)
          const prefixMatches = xml.matchAll(/<CommonPrefixes>[\s\S]*?<Prefix>([^<]+)<\/Prefix>[\s\S]*?<\/CommonPrefixes>/g);
          for (const match of prefixMatches) {
            const folderPath = match[1];
            const name = folderPath.slice(prefix.length).replace(/\/$/, '');
            if (name && name !== '.keep') {
              files.push({
                name,
                path: folderPath.replace(/\/$/, ''),
                isDirectory: true,
                size: 0,
                lastModified: new Date().toISOString()
              });
            }
          }
          
          // Simple XML parsing for Contents (files)
          const contentMatches = xml.matchAll(/<Contents>[\s\S]*?<Key>([^<]+)<\/Key>[\s\S]*?<Size>([^<]+)<\/Size>[\s\S]*?<LastModified>([^<]+)<\/LastModified>[\s\S]*?<\/Contents>/g);
          for (const match of contentMatches) {
            const key = match[1];
            const size = parseInt(match[2]);
            const lastModified = match[3];
            const name = key.slice(prefix.length);
            
            if (name && !name.includes('/') && !name.endsWith('.keep')) {
              files.push({
                name,
                path: key,
                isDirectory: false,
                size,
                lastModified
              });
            }
          }
          
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

      case 'write':
        if (request.method !== 'PUT') {
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
          
          const uploadHeaders = {
            'Content-Type': contentType,
            'Content-Length': body.byteLength.toString()
          };
          
          const { url: signedUrl, headers } = await signRequest('PUT', `/${uploadPath}`, {}, uploadHeaders);
          
          const response = await fetch(signedUrl, {
            method: 'PUT',
            headers,
            body
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('R2 upload failed:', errorText);
            throw new Error(`Upload failed: ${response.status}`);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Upload error:', error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'read':
        try {
          const downloadPath = url.searchParams.get('path');
          if (!downloadPath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { url: signedUrl, headers } = await signRequest('GET', `/${downloadPath}`);
          const response = await fetch(signedUrl, { headers });
          
          if (!response.ok) {
            console.error('R2 download failed:', response.status);
            return new Response('Not found', { status: 404, headers: corsHeaders });
          }

          const responseHeaders = {
            ...corsHeaders,
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
          };

          return new Response(response.body, { headers: responseHeaders });
        } catch (error) {
          console.error('Download error:', error);
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

          const { url: signedUrl, headers } = await signRequest('DELETE', `/${deletePath}`);
          const response = await fetch(signedUrl, {
            method: 'DELETE',
            headers
          });
          
          if (!response.ok && response.status !== 404) {
            const errorText = await response.text();
            console.error('R2 delete failed:', errorText);
            throw new Error(`Delete failed: ${response.status}`);
          }

          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Delete error:', error);
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

          const uploadHeaders = {
            'Content-Type': 'text/plain',
            'Content-Length': '0'
          };
          
          const { url: signedUrl, headers } = await signRequest('PUT', `/${folderPath}/.keep`, {}, uploadHeaders);
          
          const response = await fetch(signedUrl, {
            method: 'PUT',
            headers,
            body: ''
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error('R2 create folder failed:', errorText);
            throw new Error(`Create folder failed: ${response.status}`);
          }
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } catch (error) {
          console.error('Create folder error:', error);
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