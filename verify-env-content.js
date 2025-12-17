import fs from 'fs';
import path from 'path';

console.log("\n🕵️ DEEP INSPECTION OF .env FILE (STRICT MODE)...\n");

const envPath = path.resolve(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
    console.error("❌ CRITICAL: .env file does not exist!");
    process.exit(1);
}

const content = fs.readFileSync(envPath, 'utf-8');
const lines = content.split('\n');

const required = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID'
];

let hasError = false;

required.forEach(key => {
    const line = lines.find(l => l.startsWith(key));
    if (!line) {
        console.error(`❌ MISSING KEY: ${key}`);
        hasError = true;
    } else {
        const value = line.split('=')[1]?.trim();
        if (!value) {
            console.error(`❌ EMPTY VALUE: ${key} is empty.`);
            hasError = true;
        } else {
            // CHECK FOR QUOTES
            if (value.startsWith("'") || value.startsWith('"')) {
                console.error(`❌ QUOTES DETECTED on ${key}`);
                console.error(`   Current Value: ${value}`);
                console.error(`   REQUIRED:      ${value.replace(/['"]/g, '')}`);
                console.error("   >>> YOU MUST REMOVE THE QUOTES! <<<");
                hasError = true;
            } else if (value.includes("YOUR_")) {
                console.error(`❌ PLACEHOLDER DETECTED: ${key}`);
                hasError = true;
            } else {
                const masked = value.substring(0, 4) + "****" + value.substring(value.length - 4);
                console.log(`✅ ${key} = ${masked}`);
            }
        }
    }
});

if (hasError) {
    console.log("\n⛔ STOP! You cannot deploy until you fix the above errors.");
    console.log("   Open '.env' and remove the quotes/placeholders.");
} else {
    console.log("\n✅ .env looks valid! You are ready to deploy.");
}
