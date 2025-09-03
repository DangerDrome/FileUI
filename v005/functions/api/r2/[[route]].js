// R2 API implementation that supports dynamic bucket selection
// Uses AWS Signature V4 signing for S3-compatible API access

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

    // AWS Signature V4 implementation
    const signRequest = async (method, path, headers = {}, body = null) => {
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
      
      // Canonical URI
      const canonicalUri = `/${bucket}${path}`;
      
      // Canonical headers
      const canonicalHeaders = {
        'host': host,
        'x-amz-date': amzDate,
        'x-amz-content-sha256': 'UNSIGNED-PAYLOAD',
        ...headers
      };
      
      const signedHeaders = Object.keys(canonicalHeaders).sort().join(';');
      const canonicalHeadersStr = Object.keys(canonicalHeaders)
        .sort()
        .map(k => `${k}:${canonicalHeaders[k]}`)
        .join('\n') + '\n';
      
      // Canonical request
      const canonicalRequest = [
        method,
        canonicalUri,
        '', // query string
        canonicalHeadersStr,
        signedHeaders,
        'UNSIGNED-PAYLOAD'
      ].join('\n');
      
      // String to sign
      const hashedCanonicalRequest = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(canonicalRequest)
      );
      const stringToSign = [
        algorithm,
        amzDate,
        credentialScope,
        Array.from(new Uint8Array(hashedCanonicalRequest))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('')
      ].join('\n');
      
      // Calculate signature
      const getSignatureKey = async (key, dateStamp, regionName, serviceName) => {
        const kDate = await crypto.subtle.importKey(
          'raw',
          new TextEncoder().encode('AWS4' + key),
          { name: 'HMAC', hash: 'SHA-256' },
          false,
          ['sign']
        );
        const kRegion = await crypto.subtle.sign(
          'HMAC',
          kDate,
          new TextEncoder().encode(dateStamp)
        );
        const kService = await crypto.subtle.sign(
          'HMAC',
          await crypto.subtle.importKey('raw', kRegion, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
          new TextEncoder().encode(regionName)
        );
        const kSigning = await crypto.subtle.sign(
          'HMAC',
          await crypto.subtle.importKey('raw', kService, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
          new TextEncoder().encode(serviceName)
        );
        return crypto.subtle.sign(
          'HMAC',
          await crypto.subtle.importKey('raw', kSigning, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
          new TextEncoder().encode('aws4_request')
        );
      };
      
      const signingKey = await getSignatureKey(secretKey, dateStamp, region, service);
      const signature = await crypto.subtle.sign(
        'HMAC',
        await crypto.subtle.importKey('raw', signingKey, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']),
        new TextEncoder().encode(stringToSign)
      );
      
      const signatureHex = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      
      // Authorization header
      const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signatureHex}`;
      
      return {
        url: `${endpoint}${canonicalUri}`,
        headers: {
          ...canonicalHeaders,
          'Authorization': authorizationHeader
        }
      };
    };

    // Handle different routes
    switch (route) {
      case 'test':
        try {
          // Test by listing bucket
          const { url: signedUrl, headers } = await signRequest('GET', '/', {}, null);
          const response = await fetch(signedUrl + '?max-keys=1', { headers });
          
          if (response.ok) {
            return new Response(JSON.stringify({ success: true }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          } else {
            const error = await response.text();
            return new Response(JSON.stringify({ success: false, error }), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        } catch (error) {
          return new Response(JSON.stringify({ success: false, error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'list':
        try {
          const path = url.searchParams.get('path') || '';
          const prefix = path ? path + '/' : '';
          
          const { url: signedUrl, headers } = await signRequest('GET', '/', {}, null);
          const listUrl = signedUrl + `?list-type=2&prefix=${encodeURIComponent(prefix)}&delimiter=/&max-keys=1000`;
          
          const response = await fetch(listUrl, { headers });
          
          if (!response.ok) {
            throw new Error(`List failed: ${response.status} ${await response.text()}`);
          }
          
          const xml = await response.text();
          
          // Parse XML response
          const parser = new DOMParser();
          const doc = parser.parseFromString(xml, 'text/xml');
          
          const files = [];
          
          // Add folders (CommonPrefixes)
          const prefixes = doc.querySelectorAll('CommonPrefixes > Prefix');
          prefixes.forEach(prefixNode => {
            const folderPath = prefixNode.textContent;
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
          });
          
          // Add files (Contents)
          const contents = doc.querySelectorAll('Contents');
          contents.forEach(content => {
            const key = content.querySelector('Key').textContent;
            const name = key.slice(prefix.length);
            
            if (name && !name.includes('/') && !name.endsWith('.keep')) {
              files.push({
                name,
                path: key,
                isDirectory: false,
                size: parseInt(content.querySelector('Size').textContent),
                lastModified: content.querySelector('LastModified').textContent
              });
            }
          });
          
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
          
          const { url: signedUrl, headers } = await signRequest('PUT', `/${uploadPath}`, {
            'content-type': contentType,
            'content-length': body.byteLength.toString()
          }, body);
          
          const response = await fetch(signedUrl, {
            method: 'PUT',
            headers,
            body
          });
          
          if (!response.ok) {
            throw new Error(`Upload failed: ${response.status} ${await response.text()}`);
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

      case 'download':
        try {
          const downloadPath = url.searchParams.get('path');
          if (!downloadPath) {
            return new Response(JSON.stringify({ error: 'Path required' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }

          const { url: signedUrl, headers } = await signRequest('GET', `/${downloadPath}`, {}, null);
          const response = await fetch(signedUrl, { headers });
          
          if (!response.ok) {
            return new Response('Not found', { status: 404, headers: corsHeaders });
          }

          const responseHeaders = {
            ...corsHeaders,
            'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
          };

          return new Response(response.body, { headers: responseHeaders });
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

          const { url: signedUrl, headers } = await signRequest('DELETE', `/${deletePath}`, {}, null);
          const response = await fetch(signedUrl, {
            method: 'DELETE',
            headers
          });
          
          if (!response.ok && response.status !== 404) {
            throw new Error(`Delete failed: ${response.status} ${await response.text()}`);
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
          const { url: signedUrl, headers } = await signRequest('PUT', `/${folderPath}/.keep`, {
            'content-type': 'text/plain',
            'content-length': '0'
          }, new ArrayBuffer(0));
          
          const response = await fetch(signedUrl, {
            method: 'PUT',
            headers,
            body: ''
          });
          
          if (!response.ok) {
            throw new Error(`Create folder failed: ${response.status} ${await response.text()}`);
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