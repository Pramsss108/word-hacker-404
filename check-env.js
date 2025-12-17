import fs from 'fs';
import path from 'path';

console.log("\n🔍 INSPECTING ENVIRONMENT VARIABLES...\n");

const envPath = path.resolve(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
    console.error("❌ ERROR: .env file is MISSING!");
    console.error("   Solution: Rename .env.example to .env and fill it in.");
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

const keys = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_AI_ACCESS_SECRET'
];

let missing = false;

keys.forEach(key => {
    const found = lines.some(line => line.startsWith(key + '=') && line.split('=')[1].trim().length > 0);
    if (found) {
        console.log(`✅ FOUND: ${key}`);
    } else {
        console.error(`❌ MISSING: ${key}`);
        missing = true;
    }
});

if (missing) {
    console.log("\n⚠️  FIX YOUR .env FILE!");
    console.log("   Open .env and ensure these keys have values.");
} else {
    console.log("\n✅ .env LOOKS GOOD.");
}

console.log("\nDone.");
