/* eslint-disable no-restricted-globals */
// @ts-ignore
import ImageTracer from 'imagetracerjs';

self.onmessage = (e: MessageEvent) => {
  const { imageData, options } = e.data;

  try {
    // ImageTracer.imagedataToSVG expects an ImageData-like object { width, height, data }
    // and an options object.
    const svgString = ImageTracer.imagedataToSVG(imageData, options);
    
    self.postMessage({ type: 'success', svg: svgString });
  } catch (error) {
    self.postMessage({ type: 'error', error: String(error) });
  }
};
