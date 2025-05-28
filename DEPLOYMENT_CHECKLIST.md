# Deployment Checklist

## Backend Server (api.urbanwealthcapitals.com)

### ✅ Fixed Issues:
1. **CORS Configuration**: Added `https://chat.urbanwealthcapitals.com` to allowed origins
2. **API Routes**: Added alternative routes without `/api` prefix
3. **Health Check**: Added `/health` and `/cors-test` endpoints
4. **Debugging**: Added request logging middleware

### 🚀 Deploy Steps:
1. Push the updated `server.js` to your backend repository
2. Deploy to your hosting platform (Heroku, Railway, etc.)
3. Verify deployment by visiting: `https://api.urbanwealthcapitals.com/health`

## Frontend (chat.urbanwealthcapitals.com)

### ✅ Fixed Issues:
1. **Environment Configuration**: Updated to use production API URLs
2. **Vercel Configuration**: Added proper proxy rules
3. **API Configuration**: Added environment detection

### 🚀 Deploy Steps:
1. Push the updated files to your frontend repository
2. Redeploy on Vercel
3. Set environment variables in Vercel dashboard:
   - `VITE_API_URL=https://api.urbanwealthcapitals.com`
   - `VITE_SOCKET_URL=https://api.urbanwealthcapitals.com`

## Testing

### 1. Test CORS:
Visit: `https://api.urbanwealthcapitals.com/cors-test`

### 2. Test API:
```bash
curl -X POST https://api.urbanwealthcapitals.com/health
```

### 3. Test Frontend:
1. Open browser console on `https://chat.urbanwealthcapitals.com`
2. Check for environment logs
3. Try sending a message

## Troubleshooting

If still getting CORS errors:
1. Check server logs for incoming requests
2. Verify the Origin header in requests
3. Ensure backend server is running on correct port
4. Check if SSL certificates are valid

## Environment Variables (Vercel)

Set these in your Vercel project settings:
```
VITE_API_URL=https://api.urbanwealthcapitals.com
VITE_SOCKET_URL=https://api.urbanwealthcapitals.com
VITE_MOCK_MODE=false
``` 