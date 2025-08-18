# 🌐 Proxy Setup Guide for OpenAI API Access

## Quick Fix for Your Issue

The reason your OpenAI API calls are timing out is that you need to configure a proxy to access OpenAI's API from your region.

## 🚀 Steps to Fix:

### 1. Get Your Proxy Details
You'll need:
- Proxy server address (e.g., `proxy.example.com`)
- Proxy port (e.g., `8080`)
- Username/password (if required)

### 2. Update Environment Variables

Edit your `.env.local` file and uncomment these lines:

```bash
# For basic proxy (no authentication)
HTTP_PROXY=http://your-proxy-server:port
HTTPS_PROXY=http://your-proxy-server:port

# For authenticated proxy
HTTP_PROXY=http://username:password@proxy-server:port
HTTPS_PROXY=http://username:password@proxy-server:port
```

### 3. Example Configurations

**Basic Proxy:**
```bash
HTTP_PROXY=http://10.0.0.1:8080
HTTPS_PROXY=http://10.0.0.1:8080
```

**Authenticated Proxy:**
```bash
HTTP_PROXY=http://myuser:mypass@proxy.company.com:3128
HTTPS_PROXY=http://myuser:mypass@proxy.company.com:3128
```

**SOCKS Proxy:**
```bash
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080
```

### 4. Restart Development Server

After updating `.env.local`, restart your dev server:

```bash
# Kill the current server (Ctrl+C)
# Then restart
pnpm run dev
```

### 5. Test the Connection

The system will now:
- ✅ Use your proxy for all OpenAI API calls
- ✅ Show proxy configuration in console logs
- ✅ Provide real AI responses instead of timeouts

## 🔧 Common Proxy Types:

### Corporate/Company Proxy
Usually requires authentication:
```bash
HTTP_PROXY=http://username:password@corporate-proxy:8080
HTTPS_PROXY=http://username:password@corporate-proxy:8080
```

### VPN Proxy
Often uses SOCKS:
```bash
HTTP_PROXY=socks5://127.0.0.1:1080
HTTPS_PROXY=socks5://127.0.0.1:1080
```

### Public/Commercial Proxy
May or may not require auth:
```bash
HTTP_PROXY=http://proxy-server.com:3128
HTTPS_PROXY=http://proxy-server.com:3128
```

## 🚨 Security Notes:

- Never commit proxy credentials to git
- Use environment variables only
- Keep credentials secure
- Test with a simple message first

## 📊 What Will Happen:

1. **Before Proxy Setup:** API calls timeout → Fast path fallback → Generic responses
2. **After Proxy Setup:** API calls succeed → Full AI analysis → Personalized therapeutic responses

## 🧪 Testing:

1. Set up your proxy in `.env.local`
2. Restart the dev server
3. Send a message like "I'm feeling anxious today"
4. You should see:
   - Console logs showing proxy configuration
   - Real AI processing (not just fast path)
   - Personalized, context-aware responses

The system will automatically detect the proxy configuration and route all OpenAI API calls through it!