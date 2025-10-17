// A helper function to fetch files for FFmpeg
const fetchFile = async (file: File | Blob): Promise<Uint8Array> => {
    return new Uint8Array(await file.arrayBuffer());
};

/**
 * Initializes and loads the FFmpeg.wasm library.
 * This version uses the single-threaded core to avoid SharedArrayBuffer issues.
 * @param FFmpeg - The FFmpeg object from the UMD script.
 * @returns A Promise that resolves with the loaded FFmpeg instance.
 */
export const initializeFFmpeg = async (FFmpeg: any) => {
    const ffmpeg = FFmpeg.createFFmpeg({
        // Use the single-threaded core to avoid "SharedArrayBuffer is not defined" error
        corePath: 'https://unpkg.com/@ffmpeg/core-st@0.11.0/dist/ffmpeg-core.js',
        log: true, // Set to true to see FFmpeg logs in the console
    });
    await ffmpeg.load();
    return ffmpeg;
};

/**
 * Extracts the audio track from a video file and returns it as a WAV Blob.
 * @param ffmpeg - The initialized FFmpeg instance.
 * @param videoFile - The video file (File object).
 * @returns A Promise that resolves with a Blob of the extracted audio in WAV format.
 */
export const extractAudio = async (ffmpeg: any, videoFile: File): Promise<Blob> => {
    const inputFileName = 'input.video';
    const outputFileName = 'output.wav';

    ffmpeg.FS('writeFile', inputFileName, await fetchFile(videoFile));

    // Command to extract audio and convert to WAV format
    // -vn: no video, -acodec pcm_s16le: standard WAV codec
    await ffmpeg.run('-i', inputFileName, '-vn', '-acodec', 'pcm_s16le', '-ar', '44100', '-ac', '2', outputFileName);

    const data = ffmpeg.FS('readFile', outputFileName);
    ffmpeg.FS('unlink', inputFileName);
    ffmpeg.FS('unlink', outputFileName);
    
    return new Blob([data.buffer], { type: 'audio/wav' });
};


/**
 * Replaces the audio track of a video file with a new audio track.
 * @param ffmpeg - The initialized FFmpeg instance.
 * @param videoFile - The original video file (File object).
 * @param newAudioBlob - The processed audio to insert (Blob object).
 * @returns A Promise that resolves with a Blob of the new video file in MP4 format.
 */
export const replaceAudioInVideo = async (ffmpeg: any, videoFile: File, newAudioBlob: Blob): Promise<Blob> => {
    const videoFileName = 'input.video';
    const audioFileName = 'input.audio';
    const outputFileName = 'output.mp4';

    ffmpeg.FS('writeFile', videoFileName, await fetchFile(videoFile));
    ffmpeg.FS('writeFile', audioFileName, await fetchFile(newAudioBlob));

    // Command to merge original video stream with new audio stream
    // -c:v copy: copies the video stream without re-encoding, preserving quality
    // -map 0:v:0: selects the video stream from the first input (video file)
    // -map 1:a:0: selects the audio stream from the second input (audio file)
    // -shortest: finishes encoding when the shortest input stream ends
    await ffmpeg.run('-i', videoFileName, '-i', audioFileName, '-c:v', 'copy', '-map', '0:v:0', '-map', '1:a:0', '-shortest', outputFileName);

    const data = ffmpeg.FS('readFile', outputFileName);
    ffmpeg.FS('unlink', videoFileName);
    ffmpeg.FS('unlink', audioFileName);
    ffmpeg.FS('unlink', outputFileName);

    return new Blob([data.buffer], { type: 'video/mp4' });
};