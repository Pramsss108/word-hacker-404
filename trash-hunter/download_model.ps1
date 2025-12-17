[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$url = "https://github.com/onnx/models/raw/main/vision/classification/squeezenet/model/squeezenet1.0-9.onnx"
$output = "d:\A scret project\Word hacker 404\trash-hunter\src-tauri\resources\squeezenet1.0-9.onnx"

Write-Host "Downloading model to $output..."
try {
    Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
    Write-Host "Download Complete!" -ForegroundColor Green
}
catch {
    Write-Error "Download Failed: $_"
    exit 1
}
