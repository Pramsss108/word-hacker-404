export async function fetchToObjectURL(url: string): Promise<string> {
  const resp = await fetch(url, { mode: 'cors' });
  if (!resp.ok) throw new Error(`Fetch failed: ${resp.status}`);
  const blob = await resp.blob();
  return URL.createObjectURL(blob);
}

export async function revokeObjectURL(url: string) {
  try { URL.revokeObjectURL(url); } catch (e) { }
}

export async function objectUrlToImageData(objectUrl: string): Promise<ImageData> {
  return new Promise<ImageData>((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No 2D context'));
      try {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      } catch (err) {
        reject(err);
      }
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = objectUrl;
  });
}
