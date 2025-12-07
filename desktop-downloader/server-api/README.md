# Word Hacker 404 - Server API (Prototype)

This folder will contain the server-side logic to protect the "Secret Sauce".

## Planned Structure

- `main.py` (FastAPI) or `worker.js` (Cloudflare)
- `auth.py` (License validation)
- `tokenizer.py` (Download token generation)

## Security Principle

1. Client sends URL + License Key.
2. Server validates License.
3. Server resolves video info (using server-side yt-dlp).
4. Server returns signed Token.
5. Client uses Token to download.
