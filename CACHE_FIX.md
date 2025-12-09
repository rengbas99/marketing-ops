# UI Cache Issues - Fixed

## Problem
UI changes weren't appearing even after updates due to aggressive browser caching.

## Root Causes
1. **Firebase hosting cache headers** were set to cache JS/CSS files for 1 year with `immutable` flag
2. **HTML files** had cache headers but browsers were still serving cached JS/CSS
3. **No cache-busting meta tags** in HTML

## Solutions Applied

### 1. Updated `firebase.json` Cache Headers
- **Assets in `/assets/**`**: Still cached for 1 year (Vite generates hashed filenames)
- **Other JS/CSS files**: Now cached for 1 hour with `must-revalidate`
- **HTML files**: Changed to `no-cache, no-store, must-revalidate`
- **Images/fonts**: Cached for 24 hours with `must-revalidate`

### 2. Updated `vite.config.js`
- Ensured proper hash-based cache busting for all assets
- Added `emptyOutDir: true` to clear build directory before building
- Added development server headers to prevent caching

### 3. Added Cache-Busting Meta Tags to `index.html`
- Added `Cache-Control`, `Pragma`, and `Expires` meta tags

## How to Deploy the Fix

### For Firebase Hosting:
```bash
cd marketing-ops
npm run build
firebase deploy --only hosting
```

### For Vercel:
```bash
cd marketing-ops
npm run build
# Vercel will auto-deploy on git push, or:
vercel --prod
```

## For Users Experiencing Cache Issues

### Clear Browser Cache:
1. **Chrome/Edge**: `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"

2. **Hard Refresh**:
   - Windows: `Ctrl+F5` or `Ctrl+Shift+R`
   - Mac: `Cmd+Shift+R`

3. **Clear Site Data** (if hard refresh doesn't work):
   - Open DevTools (F12)
   - Go to Application tab
   - Click "Clear site data"
   - Refresh page

### For Developers:
```bash
# Clear Vite build cache
rm -rf marketing-ops/dist
rm -rf marketing-ops/node_modules/.vite

# Rebuild
cd marketing-ops
npm run build
```

## Testing
After deployment, verify:
1. Open site in incognito/private window
2. Check Network tab in DevTools - files should have correct cache headers
3. Make a UI change, rebuild, and verify it appears after hard refresh

## Future Prevention
- Always use Vite's hash-based filenames (already configured)
- Test in incognito mode after deployments
- Monitor cache headers in Network tab
- Consider adding a version number or build timestamp to HTML

