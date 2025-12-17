const fs = require('fs');
const https = require('https');
const path = require('path');

// Target URL and Path
const fileUrl = "https://github.com/onnx/models/raw/main/vision/classification/squeezenet/model/squeezenet1.0-9.onnx";
const targetPath = path.join(__dirname, "src-tauri", "resources", "squeezenet1.0-9.onnx");

console.log("------------------------------------------------");
console.log("   WH404 AI MODEL DOWNLOADER (CommonJS)        ");
console.log("------------------------------------------------");
console.log(`Target: ${targetPath}`);

// Ensure directory exists
const dir = path.dirname(targetPath);
if (!fs.existsSync(dir)) {
    console.log(`Creating directory: ${dir}`);
    fs.mkdirSync(dir, { recursive: true });
}

const file = fs.createWriteStream(targetPath);

console.log("Connecting to GitHub...");

https.get(fileUrl, (response) => {
    // Check for redirects (302/301) - GitHub raw often redirects
    if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
        console.log(`Redirecting to: ${response.headers.location}`);
        https.get(response.headers.location, (redirectResponse) => {
            handleResponse(redirectResponse);
        }).on('error', handleError);
        return;
    }

    handleResponse(response);

}).on('error', handleError);

function handleResponse(response) {
    if (response.statusCode !== 200) {
        console.error(`❌ Download Failed. HTTP Status: ${response.statusCode}`);
        file.close();
        fs.unlink(targetPath, () => { });
        return;
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;

    response.pipe(file);

    response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize) {
            const percent = ((downloaded / totalSize) * 100).toFixed(1);
            process.stdout.write(`\r⬇️  Progress: ${percent}%  [${(downloaded / 1024 / 1024).toFixed(2)} MB]`);
        } else {
            process.stdout.write(`\r⬇️  Downloaded: ${(downloaded / 1024 / 1024).toFixed(2)} MB`);
        }
    });

    file.on('finish', () => {
        file.close();
        console.log('\n\n✅ Download Complete!');
        console.log('------------------------------------------------');
    });
}

function handleError(err) {
    fs.unlink(targetPath, () => { });
    console.error(`\n❌ Network Error: ${err.message}`);
}
