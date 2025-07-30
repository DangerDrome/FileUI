# Deploy FileUI v005 to Cloudflare Pages

## Quick Deploy

1. Build the project:
```bash
cd v005
npm install
npm run build
```

2. Deploy to Cloudflare Pages:
```bash
npx wrangler pages deploy dist --project-name=fileui-v005
```

## Manual Deploy via Dashboard

1. Build locally:
```bash
npm run build
```

2. Go to [Cloudflare Pages Dashboard](https://dash.cloudflare.com/pages)
3. Create new project
4. Upload `dist` folder
5. Done!

## Features on Cloudflare Pages

- ✅ BSP Panel System works fully
- ✅ Demo file structure (no server needed)
- ✅ File preview for text files
- ✅ Image preview support
- ✅ Drag & drop panels
- ✅ Pin/unpin panels
- ✅ Ultra-thin design

## Note

When deployed to Cloudflare Pages without a backend server, the file explorer shows demo VFX project files. To use with real files, you'll need to run the Python server locally.