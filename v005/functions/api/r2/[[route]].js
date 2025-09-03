// AWS SDK v3 imports for S3-compatible operations
import { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';

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

    // Always use S3-compatible client for flexibility
    // This works with R2, S3, GCS, MinIO, etc.
    return handleS3Compatible(route, request, credentials, corsHeaders);
  } catch (error) {
    console.error('R2 API error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

// Handler for S3-compatible endpoints
async function handleS3Compatible(route, request, credentials, corsHeaders) {
  const { accessKey, secretKey, endpoint, bucket } = credentials;
  const url = new URL(request.url);
  
  // Configure S3 client
  const s3Config = {
    credentials: {
      accessKeyId: accessKey,
      secretAccessKey: secretKey,
    },
    region: 'auto', // R2 uses 'auto'
  };

  // Parse endpoint to determine if it's R2, S3, or custom
  if (endpoint) {
    if (endpoint.includes('r2.cloudflarestorage.com')) {
      // R2 endpoint
      const accountId = endpoint.match(/https:\/\/(\w+)\.r2\.cloudflarestorage\.com/)?.[1];
      if (accountId) {
        s3Config.endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
      }
    } else if (endpoint.includes('amazonaws.com')) {
      // AWS S3 - extract region from endpoint
      const region = endpoint.match(/s3[.-]([^.]+)\.amazonaws\.com/)?.[1] || 'us-east-1';
      s3Config.region = region;
    } else if (endpoint.includes('storage.googleapis.com')) {
      // Google Cloud Storage
      s3Config.endpoint = 'https://storage.googleapis.com';
    } else {
      // Custom endpoint (MinIO, etc.)
      s3Config.endpoint = endpoint;
    }
  }

  const s3 = new S3Client(s3Config);
  const bucketName = bucket || 'default-bucket';

  switch (route) {
    case 'test':
      try {
        // Test connection by trying to list with max 1 result
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          MaxKeys: 1
        });
        await s3.send(command);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          type: error.name 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

    case 'list':
      try {
        const path = url.searchParams.get('path') || '';
        const prefix = path ? path + '/' : '';
        
        const command = new ListObjectsV2Command({
          Bucket: bucketName,
          Prefix: prefix,
          Delimiter: '/'
        });
        
        const response = await s3.send(command);
        const files = [];

        // Add folders
        if (response.CommonPrefixes) {
          for (const commonPrefix of response.CommonPrefixes) {
            const folderPath = commonPrefix.Prefix || '';
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
        }

        // Add files
        if (response.Contents) {
          for (const object of response.Contents) {
            const key = object.Key || '';
            const name = key.slice(prefix.length);
            if (name && !name.endsWith('.keep')) {
              files.push({
                name,
                path: key,
                isDirectory: false,
                size: object.Size || 0,
                lastModified: object.LastModified?.toISOString() || new Date().toISOString()
              });
            }
          }
        }

        return new Response(JSON.stringify(files), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
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
        
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: uploadPath,
          Body: new Uint8Array(body),
          ContentType: contentType
        });
        
        await s3.send(command);
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

        const command = new GetObjectCommand({
          Bucket: bucketName,
          Key: downloadPath
        });
        
        const response = await s3.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const body = Buffer.concat(chunks);
        
        const responseHeaders = {
          ...corsHeaders,
          'Content-Type': response.ContentType || 'application/octet-stream',
        };

        return new Response(body, { headers: responseHeaders });
      } catch (error) {
        if (error.name === 'NoSuchKey') {
          return new Response('Not found', { status: 404, headers: corsHeaders });
        }
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

        const command = new DeleteObjectCommand({
          Bucket: bucketName,
          Key: deletePath
        });
        
        await s3.send(command);
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
        const command = new PutObjectCommand({
          Bucket: bucketName,
          Key: folderPath + '/.keep',
          Body: '',
          ContentType: 'text/plain'
        });
        
        await s3.send(command);
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
}