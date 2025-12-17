const fs = require('fs');
const https = require('https');
const path = require('path');

// Trying SqueezeNet 1.1 which is often more stable, or the exact commit hash if found
// Backup: Local placeholder if download fails
const fileUrl = "https://github.com/onnx/models/raw/main/validated/vision/classification/squeezenet/model/squeezenet1.1-7.onnx";
const targetPath = path.join(__dirname, "src-tauri", "resources", "squeezenet1.0-9.onnx"); // Keep filename expected by Rust

console.log("------------------------------------------------");
console.log("   WH404 AI MODEL DOWNLOADER (Mirror Attempt)   ");
console.log("------------------------------------------------");

const dir = path.dirname(targetPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

const file = fs.createWriteStream(targetPath);

console.log(`Target: ${targetPath}`);
console.log(`Source: ${fileUrl}`);

https.get(fileUrl, (response) => {
    if (response.statusCode > 300 && response.statusCode < 400 && response.headers.location) {
        https.get(response.headers.location, handleResponse).on('error', handleError);
        return;
    }
    handleResponse(response);
}).on('error', handleError);

function handleResponse(response) {
    if (response.statusCode !== 200) {
        console.error(`❌ Server Error: ${response.statusCode}`);
        file.close();
        fs.unlink(targetPath, () => { });
        return;
    }
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('\n✅ Download Complete! (Saved as squeezenet1.0-9.onnx)');
    });
}

function handleError(err) {
    console.error(`Error: ${err.message}`);
}
