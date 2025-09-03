# Cloudflare R2 Setup for FileUI on Cloudflare Pages

## Overview

FileUI supports R2 storage, but when deployed to Cloudflare Pages, there are some limitations due to how Cloudflare handles R2 access.

## Options for Using R2 with FileUI

### Option 1: Configure R2 Bucket Binding (Recommended)

1. Go to your Cloudflare Pages project settings
2. Navigate to **Functions** → **R2 bucket bindings**
3. Add a new binding:
   - Variable name: `R2_BUCKET`
   - R2 bucket: Select your bucket (e.g., `danger-website-media`)
4. Redeploy your Pages project

**Note**: This only allows access to a single R2 bucket that you configure in the binding.

### Option 2: Use Public R2 Buckets

1. Make your R2 bucket public in Cloudflare dashboard
2. Enable public access for the bucket
3. Use the public URL pattern: `https://pub-{account_hash}.r2.dev/{bucket}/{file}`

**Note**: This makes all files in the bucket publicly accessible.

### Option 3: Run FileUI Locally

For full R2 functionality with multiple buckets and private access:

```bash
npm run dev
```

This runs both the Vite dev server (port 5173) and Python API server (port 8000) with full R2 support.

## Why These Limitations?

- **CORS**: R2 API endpoints don't support CORS headers for direct browser access
- **Authentication**: AWS Signature V4 signing requires server-side implementation
- **Security**: Credentials should not be exposed in browser code

## Technical Details

When running on Cloudflare Pages:
- The Pages Function acts as a proxy to R2
- Without R2 bucket binding, the function cannot access R2 buckets
- Direct HTTP requests to R2 endpoints fail due to CORS

When running locally:
- The Python server handles all R2 operations
- Full support for multiple buckets
- Credentials are passed securely via headers

## Future Improvements

Potential solutions being considered:
1. Cloudflare Workers with R2 bindings for more flexibility
2. Support for presigned URLs for temporary access
3. Integration with Cloudflare Access for authentication