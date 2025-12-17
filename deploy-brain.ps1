# Deploy AI Brain Automation Script (Auto-Configured)
# -------------------------------

Write-Host "🧠 INITIALIZING CORTEX DEPLOYMENT SEQUENCE..." -ForegroundColor Cyan

# --- AUTO-CONFIGURATION ---
# SECURITY UPDATE: Key is no longer hardcoded.
$GroqKey = Read-Host "Paste your Groq API Key (gsk_...)"
$AccessPass = "word-hacker-ai-secret" 
# --------------------------

# Check placement
if (-not (Test-Path "package.json")) {
    Write-Warning "Running from wrong folder. Moving to root..."
    Set-Location "d:\A scret project\Word hacker 404"
}

# 1. Setup Project Directory
$TargetDir = "ai-gateway"
if (-not (Test-Path $TargetDir)) {
    Write-Host "Creating $TargetDir..."
    mkdir $TargetDir | Out-Null
}

$OriginalLocation = Get-Location
Set-Location $TargetDir

# 2. Create wrangler.toml
Write-Host "Configuring Wrangler..."
$WranglerConfig = @"
name = "ai-gateway"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[observability]
enabled = true
"@
$WranglerConfig | Out-File "wrangler.toml" -Encoding utf8

# 3. Create Source Directory
if (-not (Test-Path "src")) { mkdir "src" | Out-Null }

# 4. Write Server Code
$ServerCode = @"
/*
 * 🧠 CENTRAL AI BRAIN - SERVER CODE
 * --------------------------------
 * Model: openai/gpt-oss-120b (Groq)
 */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { Groq } from 'groq-sdk'

type Bindings = {
  GROQ_API_KEY: string
  ACCESS_SECRET: string
}

const app = new Hono<{ Bindings: Bindings }>()

app.use('/*', cors({
  origin: '*',
  allowMethods: ['POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'x-access-secret'],
  maxAge: 600,
}))

app.post('/v1/chat', async (c) => {
  try {
    const secret = c.req.header('x-access-secret')
    if (secret !== c.env.ACCESS_SECRET) {
      return c.json({ error: 'Unauthorized' }, 401)
    }

    const { messages, system = 'You are a helpful AI.', temperature = 0.7 } = await c.req.json()
    const groq = new Groq({ apiKey: c.env.GROQ_API_KEY })

    const conversation = [
      { role: 'system', content: system },
      ...(Array.isArray(messages) ? messages : [])
    ]

    try {
      const completion = await groq.chat.completions.create({
        messages: conversation,
        model: 'openai/gpt-oss-120b',
        temperature: temperature,
        max_tokens: 4096
      })
      return c.json({
        content: completion.choices[0]?.message?.content || '',
        model: 'openai/gpt-oss-120b',
        provider: 'groq'
      })
    } catch (err) {
      console.log('Fallback to 70b')
      const backup = await groq.chat.completions.create({
        messages: conversation,
        model: 'llama3-70b-8192',
        temperature: temperature,
        max_tokens: 4096
      })
      return c.json({
        content: backup.choices[0]?.message?.content || '',
        model: 'llama3-70b-8192-fallback',
        provider: 'groq-backup'
      })
    }
  } catch (error) {
    return c.json({ error: error.message }, 500)
  }
})

app.get('/', (c) => c.text('🧠 AI Brain Online'))
export default app
"@
$ServerCode | Out-File "src\index.ts" -Encoding utf8

# 5. Build & Deploy
Write-Host "🚀 STARTING INSTALLATION..." -ForegroundColor Green
Write-Host "PLEASE LOOK FOR A BROWSER WINDOW TO LOGIN!" -ForegroundColor Yellow

# Install deps silently
if (-not (Test-Path "node_modules")) {
    npm init -y | Out-Null
    npm install hono groq-sdk --silent
}

# Login (Interactive)
cmd /c "npx wrangler login"

# Set Secrets (Auto)
Write-Host "Encrypting secrets..."
echo $GroqKey | cmd /c "npx wrangler secret put GROQ_API_KEY"
echo $AccessPass | cmd /c "npx wrangler secret put ACCESS_SECRET"

# Deploy
Write-Host "Publishing..."
cmd /c "npx wrangler deploy"

Write-Host "✅ DONE! Copy the URL above." -ForegroundColor Green
# Beep to alert user
[System.Console]::Beep(800, 500)
Set-Location $OriginalLocation
