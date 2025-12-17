const fs = require('fs');
const https = require('https');
const path = require('path');

const fileUrl = "https://github.com/onnx/models/raw/main/vision/classification/squeezenet/model/squeezenet1.0-9.onnx";
const targetPath = path.join(__dirname, "src-tauri", "resources", "squeezenet1.0-9.onnx");

// Ensure directory exists
const dir = path.dirname(targetPath);
if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
}

console.log(`Donwloading model to: ${targetPath}`);
console.log(`Source: ${fileUrl}`);

const file = fs.createWriteStream(targetPath);

https.get(fileUrl, (response) => {
    if (response.statusCode !== 200) {
        console.error(`Failed to download. Status Code: ${response.statusCode}`);
        return;
    }

    const totalSize = parseInt(response.headers['content-length'], 10);
    let downloaded = 0;

    response.pipe(file);

    response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (totalSize) {
            const percent = ((downloaded / totalSize) * 100).toFixed(2);
            process.stdout.write(`\rDownloading... ${percent}% (${(downloaded / 1024 / 1024).toFixed(2)} MB)`);
        }
    });

    file.on('finish', () => {
        file.close();
        console.log('\nDownload Completed Successfully! ✅');
    });
}).on('error', (err) => {
    fs.unlink(targetPath, () => { }); // Delete the file async. (But we don't check for this)
    console.error(`\nError: ${err.message}`);
});
