import React, { useState, useEffect, useRef } from 'react';
import {
    Shrink,
    FileArchive,
    UploadCloud,
    Download,
    Trash2,
    CheckCircle,
    AlertCircle,
    Archive,
    Plus,
    ChevronDown,
    ChevronUp
} from 'lucide-react';
import SeoWrapper from './SeoWrapper';
import MatrixRain from './MatrixRain';

// --- Utility Functions ---
const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const loadScript = (src: string) => {
    return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = reject;
        document.head.appendChild(script);
    });
};

const getGovFileName = (originalName: string, ext = 'jpg') => {
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
    const cleanName = nameWithoutExt.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 15);
    return `${cleanName}_sarkari.${ext}`;
};

// --- Core Compression Engine ---
const compressPdfToSize = async (file: File, targetKB: number, onProgress: (prog: number) => void) => {
    try {
        const targetBytes = targetKB * 1024;
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');

        const pdfjsLib = (window as any)['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const { jsPDF } = (window as any).jspdf;

        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        const numPages = pdf.numPages;

        let scale = 1.5;
        let quality = 0.8;
        let bestPdfBlob: Blob | null = null;

        for (let attempt = 0; attempt < 4; attempt++) {
            onProgress(10 + (attempt * 20));

            const newPdf = new jsPDF('p', 'pt', 'a4');
            const pdfWidth = newPdf.internal.pageSize.getWidth();
            const pdfHeight = newPdf.internal.pageSize.getHeight();

            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: scale });

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = viewport.width;
                canvas.height = viewport.height;

                await page.render({ canvasContext: ctx, viewport: viewport }).promise;

                const imgData = canvas.toDataURL('image/jpeg', quality);
                const imgRatio = canvas.width / canvas.height;
                const targetRatio = pdfWidth / pdfHeight;

                let finalW = pdfWidth;
                let finalH = pdfHeight;

                if (imgRatio > targetRatio) {
                    finalH = pdfWidth / imgRatio;
                } else {
                    finalW = pdfHeight * imgRatio;
                }

                if (pageNum > 1) newPdf.addPage();
                const yOffset = Math.max(0, (pdfHeight - finalH) / 2);
                newPdf.addImage(imgData, 'JPEG', 0, yOffset, finalW, finalH);
            }

            const pdfBlob = newPdf.output('blob');

            if (pdfBlob.size <= targetBytes) {
                bestPdfBlob = pdfBlob;
                break;
            } else {
                bestPdfBlob = pdfBlob;
                scale *= 0.7;
                quality *= 0.8;
            }
        }

        onProgress(100);
        if (!bestPdfBlob) throw new Error("Could not construct PDF");
        return new File([bestPdfBlob], getGovFileName(file.name, 'pdf'), { type: 'application/pdf' });
    } catch (e: any) {
        throw new Error(e.message || "PDF Compress Failed");
    }
};

const compressImageToSize = async (file: File, targetKB: number, onProgress: (prog: number) => void) => {
    const targetBytes = targetKB * 1024;

    return new Promise<File>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async (event: any) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error("No context"));

                let width = img.width;
                let height = img.height;

                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                const initialBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.95));
                if (initialBlob && initialBlob.size <= targetBytes) {
                    onProgress(100);
                    return resolve(new File([initialBlob], getGovFileName(file.name, 'jpg'), { type: 'image/jpeg' }));
                }

                let minQ = 0.0;
                let maxQ = 1.0;
                let quality = 0.5;
                let bestBlob: Blob | null = null;

                for (let i = 0; i < 8; i++) {
                    onProgress(10 + (i * 5));
                    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));

                    if (blob && blob.size <= targetBytes) {
                        bestBlob = blob;
                        minQ = quality;
                    } else {
                        maxQ = quality;
                    }
                    quality = (minQ + maxQ) / 2;
                }

                let scale = 1.0;
                while ((!bestBlob || bestBlob.size > targetBytes) && scale > 0.1) {
                    scale -= 0.15;
                    onProgress(60 + ((1 - scale) * 40));

                    canvas.width = Math.max(10, width * scale);
                    canvas.height = Math.max(10, height * scale);
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    bestBlob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.6));
                }

                onProgress(100);
                if (bestBlob) {
                    resolve(new File([bestBlob], getGovFileName(file.name, 'jpg'), { type: 'image/jpeg' }));
                } else {
                    reject(new Error("Could not compress to target size"));
                }
            };
            img.onerror = () => reject(new Error("Image Load Failed"));
        };
        reader.onerror = () => reject(new Error("File Read Failed"));
    });
};

interface FileJob {
    id: string;
    originalFile: File;
    compressedFile: File | null;
    originalPreview: string | null;
    compressedPreview: string | null;
    status: 'pending' | 'processing' | 'success' | 'error';
    progress: number;
    error: string | null;
    expanded: boolean;
    selected: boolean;
    customName: string;
}

// Inline File Card Component (Mobile Optimized)
const FileCard = ({
    file,
    targetSizeKB,
    onRemove,
    onProcess,
    onDownload,
    onToggleExpand,
    onToggleSelect,
    onRename
}: {
    file: FileJob,
    targetSizeKB: number,
    onRemove: (id: string) => void,
    onProcess: (file: FileJob) => void,
    onDownload: (file: FileJob) => void,
    onToggleExpand: (id: string) => void,
    onToggleSelect: (id: string) => void,
    onRename: (id: string, newName: string) => void
}) => {
    const isSuccess = file.status === 'success';
    const isError = file.status === 'error';
    const isProcessing = file.status === 'processing';
    const isTargetMet = file.compressedFile ? file.compressedFile.size <= targetSizeKB * 1024 : false;

    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState(file.customName);

    const handleSaveName = () => {
        if (editNameValue.trim() && editNameValue !== file.customName) {
            // Trigger an upward rename update. The rename prop should ideally exist, but we can do it via a global state update or pass a new `onRename` prop. 
            // We need to add `onRename: (id: string, newName: string) => void` to FileCard props above.
            onRename(file.id, editNameValue.trim());
        } else {
            setEditNameValue(file.customName); // Reset if invalid
        }
        setIsEditingName(false);
    };

    return (
        <div style={{
            background: 'rgba(10, 10, 12, 0.8)',
            border: `1px solid ${isError ? 'rgba(255, 50, 50, 0.3)' : isSuccess ? (isTargetMet ? 'rgba(10, 255, 106, 0.3)' : 'rgba(251, 191, 36, 0.3)') : 'rgba(10, 150, 255, 0.15)'}`,
            borderRadius: '16px',
            overflow: 'hidden',
            transition: 'all 0.3s ease',
            position: 'relative',
            flexShrink: 0,
            opacity: file.selected ? 1 : 0.6
        }}>
            {/* Progress Bar Background fill */}
            {isProcessing && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${file.progress}%`,
                    background: 'linear-gradient(90deg, rgba(10, 150, 255, 0.05) 0%, rgba(10, 150, 255, 0.15) 100%)',
                    zIndex: 0, transition: 'width 0.2s ease-out'
                }} />
            )}

            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', position: 'relative', zIndex: 1, minWidth: 0, width: '100%' }}>

                {/* Selection Checkbox */}
                <button onClick={() => onToggleSelect(file.id)} disabled={isProcessing} style={{
                    background: 'transparent', border: 'none', padding: '0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: file.selected ? '#0a96ff' : 'rgba(255,255,255,0.2)',
                    transition: 'color 0.2s', flexShrink: 0, cursor: isProcessing ? 'not-allowed' : 'pointer'
                }}>
                    <CheckCircle size={22} fill={file.selected ? 'rgba(10, 150, 255, 0.2)' : 'none'} />
                </button>

                {/* Thumb/Icon */}
                <div style={{
                    width: '48px', height: '48px', borderRadius: '10px',
                    background: '#000', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0
                }}>
                    {file.originalPreview ? (
                        <img src={file.originalPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <FileArchive size={24} color="#555" />
                    )}
                </div>

                {/* Info Text */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '24px' }}>
                        {isEditingName ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, marginRight: '8px' }}>
                                <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    onBlur={handleSaveName}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                                    autoFocus
                                    style={{
                                        background: 'rgba(0,0,0,0.5)', border: '1px solid #0a96ff', borderRadius: '4px',
                                        color: '#eef', fontSize: '0.9rem', fontWeight: 600, padding: '2px 4px', width: '100%',
                                        outline: 'none'
                                    }}
                                />
                                <button onClick={(e) => { e.stopPropagation(); handleSaveName(); }} style={{ background: 'transparent', border: 'none', color: '#0aff6a', padding: '0', cursor: 'pointer' }}>
                                    <CheckCircle size={16} />
                                </button>
                            </div>
                        ) : (
                            <h4
                                onClick={() => !isProcessing && setIsEditingName(true)}
                                style={{
                                    fontSize: '0.9rem', fontWeight: 600, color: '#eef',
                                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                    cursor: isProcessing ? 'default' : 'text', borderBottom: '1px dashed rgba(255,255,255,0.2)', paddingBottom: '1px'
                                }}
                            >
                                {file.customName}
                            </h4>
                        )}

                        {isSuccess && !isEditingName && (
                            <button onClick={() => onToggleExpand(file.id)} style={{ background: 'transparent', border: 'none', color: '#0aff6a', padding: '4px' }}>
                                {file.expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: '#888' }}>
                        <span>{formatBytes(file.originalFile.size)}</span>
                        {isProcessing && <span style={{ color: '#0a96ff', fontWeight: 'bold' }}> {Math.round(file.progress)}%</span>}
                        {isSuccess && file.compressedFile && (
                            <>
                                <span style={{ color: '#555' }}>→</span>
                                <span style={{
                                    color: isTargetMet ? '#0aff6a' : '#fbbf24',
                                    fontWeight: 'bold',
                                    textShadow: `0 0 4px ${isTargetMet ? 'rgba(10, 255, 106, 0.4)' : 'rgba(251, 191, 36, 0.4)'}`
                                }}>
                                    {formatBytes(file.compressedFile.size)}
                                </span>
                            </>
                        )}
                        {isError && <span style={{ color: '#ff3232', display: 'flex', alignItems: 'center', gap: '4px' }}><AlertCircle size={10} /> {file.error || "Failed"}</span>}
                    </div>
                </div>

                {/* Right Actions */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {isSuccess ? (
                        <button onClick={(e) => { e.stopPropagation(); onDownload(file); }} style={{
                            background: 'rgba(10, 255, 106, 0.1)', color: '#0aff6a', border: '1px solid rgba(10, 255, 106, 0.2)',
                            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Download size={16} />
                        </button>
                    ) : (
                        <button onClick={() => onProcess(file)} disabled={isProcessing} style={{
                            background: 'rgba(10, 150, 255, 0.1)', color: '#0a96ff', border: '1px solid rgba(10, 150, 255, 0.2)',
                            width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: isProcessing ? 0.3 : 1
                        }}>
                            <Shrink size={16} />
                        </button>
                    )}

                    <button onClick={() => onRemove(file.id)} style={{
                        background: 'transparent', color: '#ff3232', border: 'none',
                        width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        opacity: 0.6
                    }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Inline Expanded Comparison */}
            {isSuccess && file.expanded && file.compressedPreview && (
                <div style={{
                    padding: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', background: '#000',
                    display: 'flex', gap: '12px'
                }}>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>Original</span>
                        <div style={{ width: '100%', height: '120px', background: '#0a0a0c', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            {file.originalPreview && <img src={file.originalPreview} alt="Original" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
                        </div>
                    </div>
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                        <span style={{ fontSize: '0.65rem', color: '#0aff6a', textTransform: 'uppercase', letterSpacing: '1px' }}>Compressed</span>
                        <div style={{ width: '100%', height: '120px', background: '#0a0a0c', borderRadius: '8px', border: '1px solid rgba(10, 255, 106, 0.15)', overflow: 'hidden' }}>
                            <img src={file.compressedPreview} alt="Compressed" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const SarkariCompress = ({ onClose }: { onClose: () => void }) => {
    const [files, setFiles] = useState<FileJob[]>([]);
    const [targetSizeKB, setTargetSizeKB] = useState(100);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [statusText, setStatusText] = useState("Awaiting Target");
    const [status, setStatus] = useState<'idle' | 'processing' | 'ready' | 'error'>('idle');

    // The core fix: Two-step ZIP generation to preserve User Gestures
    const [compiledZipBlob, setCompiledZipBlob] = useState<Blob | null>(null);

    // Logging kept internal for console if needed
    const addLog = (msg: string) => {
        console.log(`[Sarkari Debug] ${msg}`);
    };

    const hasSelected = files.some(f => f.selected);
    const hasPendingSelected = files.some(f => f.selected && (f.status === 'pending' || f.status === 'error'));
    const allSelectedSuccess = files.filter(f => f.selected).every(f => f.status === 'success') && hasSelected;

    // Haptic Feedback Helper for Mobile Polish
    const vibrate = (pattern: number | number[]) => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
        }
    };

    useEffect(() => {
        if (isProcessing) {
            setStatus('processing');
            setStatusText("Crunching Data...");
        } else if (allSelectedSuccess) {
            if (status !== 'ready') vibrate([50, 50, 150]); // Success burst
            setStatus('ready');
            setStatusText("Encryption Complete");
        } else if (hasPendingSelected) {
            setStatus('processing'); // Use yellow indicator to say action needed
            setStatusText("Ready. Select Targets & Compress");
        } else if (files.length > 0) {
            setStatus('idle');
            setStatusText("Targets Acquired");
        } else {
            setStatus('idle');
            setStatusText("Awaiting Target");
        }
    }, [isProcessing, files, allSelectedSuccess, hasPendingSelected, status]);

    const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            vibrate(30); // light tap
            addFiles(Array.from(e.target.files));
        }
    };

    const addFiles = (newFiles: File[]) => {
        const MAX_FILES = 50;
        const MAX_SIZE_MB = 100;

        let validFiles = newFiles.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf');

        // Anti-Crash OOM Protections
        if (files.length + validFiles.length > MAX_FILES) {
            alert(`⚠️ SAFE BATCH LIMIT EXCEEDED\n\nTo prevent your device from running out of memory and crashing, you can only process a maximum of ${MAX_FILES} files at a time.`);
            validFiles = validFiles.slice(0, MAX_FILES - files.length);
        }

        const totalNewSizeMB = validFiles.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024);
        if (totalNewSizeMB > MAX_SIZE_MB) {
            alert(`⚠️ MASSIVE UPLOAD DETECTED\n\nYour selected files total ${totalNewSizeMB.toFixed(1)}MB. To prevent browser crashes, please upload smaller batches (Max ${MAX_SIZE_MB}MB at a time).`);
            return;
        }

        const fileObjects: FileJob[] = validFiles.map(file => ({
            id: Math.random().toString(36).substring(7),
            originalFile: file,
            compressedFile: null,
            originalPreview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
            compressedPreview: null,
            status: 'pending',
            progress: 0,
            error: null,
            expanded: false,
            selected: true,
            customName: file.name
        }));
        setFiles(prev => [...prev, ...fileObjects]);
    };

    const removeFile = (id: string) => {
        vibrate(40);
        setFiles(prev => {
            const fileToRm = prev.find(f => f.id === id);
            if (fileToRm) {
                if (fileToRm.originalPreview) URL.revokeObjectURL(fileToRm.originalPreview);
                if (fileToRm.compressedPreview) URL.revokeObjectURL(fileToRm.compressedPreview);
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const toggleExpand = (id: string) => setFiles(prev => prev.map(f => f.id === id ? { ...f, expanded: !f.expanded } : f));
    const toggleSelect = (id: string) => setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
    const toggleSelectAll = () => {
        const allSelected = files.every(f => f.selected);
        setFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })));
    };
    const renameFile = (id: string, newName: string) => setFiles(prev => prev.map(f => f.id === id ? { ...f, customName: newName } : f));

    const processFile = async (fileObj: FileJob) => {
        addLog(`Started processing file: ${fileObj.id} (${fileObj.originalFile.name})`);
        setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'processing', progress: 0 } : f));
        try {
            if (fileObj.originalFile.type === 'application/pdf') {
                const compressedFile = await compressPdfToSize(
                    fileObj.originalFile, targetSizeKB,
                    (prog) => setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: prog } : f))
                );
                addLog(`Success PDF compression: ${fileObj.id}. Final Size: ${compressedFile.size}`);
                setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, compressedFile, status: 'success', progress: 100 } : f));
                return;
            }

            const compressedFile = await compressImageToSize(
                fileObj.originalFile, targetSizeKB,
                (prog) => setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: prog } : f))
            );
            addLog(`Success Image compression: ${fileObj.id}. Final Size: ${compressedFile.size}`);
            const compressedPreview = URL.createObjectURL(compressedFile);
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, compressedFile, compressedPreview, status: 'success', progress: 100 } : f));

        } catch (error: any) {
            addLog(`Error processing ${fileObj.id}: ${error.message || "Failed"}`);
            setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: error.message || "Failed" } : f));
        }
    };

    const processAll = async () => {
        setIsProcessing(true);
        const pendingFiles = files.filter(f => f.selected && (f.status === 'pending' || f.status === 'error'));
        for (const file of pendingFiles) {
            await processFile(file);
        }
        setIsProcessing(false);
    };

    const downloadFile = async (fileObj: FileJob) => {
        addLog(`[DOWNLOAD START] File ID: ${fileObj.id}`);
        if (!fileObj.compressedFile) {
            addLog(`[DOWNLOAD ABORT] No compressed file found.`);
            return;
        }
        try {
            const finalName = fileObj.customName || fileObj.compressedFile.name;
            const origExt = fileObj.compressedFile.name.split('.').pop() || 'jpg';
            const downloadName = finalName.endsWith(`.${origExt}`) ? finalName : `${finalName}.${origExt}`;

            // 1. Primary Attempt: Modern File System API (Bypasses Chrome Download Manager)
            try {
                if ('showSaveFilePicker' in window) {
                    addLog(`[FS API] Requesting direct disk write permission...`);
                    const opts = {
                        suggestedName: downloadName,
                        types: [{
                            description: origExt.toUpperCase() + ' File',
                            accept: { [`${origExt === 'pdf' ? 'application/pdf' : 'image/jpeg'}`]: [`.${origExt}`] },
                        }],
                    };
                    const handle = await (window as any).showSaveFilePicker(opts);
                    const writable = await handle.createWritable();
                    await writable.write(fileObj.compressedFile);
                    await writable.close();
                    addLog(`[FS API] Disk write complete via OS level.`);
                    return; // EXIT EARLY IF SUCCESSFUL
                }
            } catch (fsErr: any) {
                if (fsErr.name === 'AbortError') {
                    addLog(`[FS API] User cancelled save dialog.`);
                    return;
                }
                addLog(`[FS API CRAH] Falling back to DOM drop. Error: ${fsErr.message}`);
            }

            // 2. Fallback: Pure Synchronous DOM Drop
            addLog(`[SYNC DOM] Dropping ${downloadName} instantly as fallback`);
            const blobUrl = URL.createObjectURL(fileObj.compressedFile);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            addLog(`[SYNC DOM] Fallback Drop complete.`);
        } catch (e: any) {
            addLog(`[DOWNLOAD CRASH] Error: ${e.message}`);
        }
    };

    const compileAllZip = async () => {
        addLog("[ZIP COMPILE START] Generating zip in background...");
        const successFiles = files.filter(f => f.selected && f.status === 'success' && f.compressedFile);
        if (successFiles.length === 0) {
            addLog("[ZIP ABORT] No successful selected files.");
            return;
        }

        setIsProcessing(true);
        setStatus('processing');
        setStatusText("Building Archive...");

        try {
            addLog(`[ZIP INIT] Processing ${successFiles.length} files...`);
            await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
            const zip = new (window as any).JSZip();
            successFiles.forEach(f => {
                if (f.compressedFile) {
                    const origExt = f.compressedFile.name.split('.').pop() || 'jpg';
                    const finalName = f.customName || f.compressedFile.name;
                    const zipName = finalName.endsWith(`.${origExt}`) ? finalName : `${finalName}.${origExt}`;
                    zip.file(zipName, f.compressedFile);
                    addLog(`[ZIP ADD] Added file: ${zipName}`);
                }
            });
            const content = await zip.generateAsync({ type: "blob" });
            addLog(`[ZIP COMPILED] Size: ${content.size} bytes`);

            setCompiledZipBlob(content);
            setStatus('ready');
            setStatusText("Archive Ready for Download");
        } catch (err: any) {
            addLog(`[ZIP CRASH] Error: ${err.message}`);
            alert("ZIP creation failed. Download individually.");
        } finally {
            setIsProcessing(false);
        }
    };

    const downloadCompiledZip = async () => {
        if (!compiledZipBlob) return;
        try {
            const downloadName = "Sarkari_BlackOps_Dump.zip";

            // 1. Primary Attempt: Modern File System API
            try {
                if ('showSaveFilePicker' in window) {
                    addLog(`[FS API] Requesting direct disk write permission for ZIP...`);
                    const opts = {
                        suggestedName: downloadName,
                        types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }],
                    };
                    const handle = await (window as any).showSaveFilePicker(opts);
                    const writable = await handle.createWritable();
                    await writable.write(compiledZipBlob);
                    await writable.close();
                    addLog(`[FS API] ZIP Disk write complete via OS level.`);
                    return; // EXIT EARLY IF SUCCESSFUL
                }
            } catch (fsErr: any) {
                if (fsErr.name === 'AbortError') {
                    addLog(`[FS API] User cancelled ZIP save dialog.`);
                    return;
                }
                addLog(`[FS API CRAH] Falling back to DOM drop. Error: ${fsErr.message}`);
            }

            // 2. Fallback: Pure Synchronous DOM Drop
            addLog(`[SYNC DOM] Dropping pre-compiled ZIP instantly...`);
            const blobUrl = URL.createObjectURL(compiledZipBlob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = downloadName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            addLog(`[SYNC DOM] ZIP Drop complete.`);
        } catch (err: any) {
            addLog(`[ZIP CRASH] Error: ${err.message}`);
        }
    };

    const SCHEMA = {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "Sarkari Compress",
        "applicationCategory": "UtilitiesApplication"
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000000', // Absolute black for OLED
            color: '#e9eef6',
            display: 'flex', flexDirection: 'column',
            fontFamily: 'system-ui, -apple-system, sans-serif'
        }} role="dialog" aria-modal="true">
            <SeoWrapper title="Sarkari Compress" description="Mobile First File Optimization." schema={SCHEMA} />

            <style>{`
                @keyframes pulseBlueBtn {
                    0% { box-shadow: 0 0 0 0 rgba(10, 150, 255, 0.7); }
                    70% { box-shadow: 0 0 0 15px rgba(10, 150, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(10, 150, 255, 0); }
                }
            `}</style>
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0, opacity: 0.3 }}>
                <MatrixRain opacity={0.05} density={8} speed={1.5} />
            </div>

            {/* Top Minimized Header */}
            <header style={{
                position: 'relative', zIndex: 50,
                padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(20px)',
                borderBottom: '1px solid rgba(10, 150, 255, 0.15)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Shrink size={20} color="#0a96ff" />
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', letterSpacing: '0.5px' }}>SARKARI<span style={{ color: '#0a96ff' }}>.COMPRESS</span></span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.65rem', color: '#0aff6a' }}>
                            <CheckCircle size={10} /> 100% Client-Side
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        background: 'rgba(10, 255, 106, 0.15)',
                        border: '1px solid rgba(10, 255, 106, 0.4)',
                        color: '#0aff6a',
                        padding: '4px 8px', borderRadius: '4px',
                        fontSize: '0.65rem', fontWeight: 800,
                        letterSpacing: '0.5px', whiteSpace: 'nowrap'
                    }}>
                        FREE FOREVER • NO SIGN UP
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#aaa', padding: '4px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }}>
                        <span style={{ width: '6px', height: '6px', background: status === 'error' ? '#f00' : status === 'processing' ? '#fbbf24' : '#0a96ff', borderRadius: '50%', boxShadow: `0 0 8px ${status === 'error' ? '#f00' : status === 'processing' ? '#fbbf24' : '#0a96ff'}` }} />
                        {statusText}
                    </div>
                    <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#fff', padding: '4px' }}>
                        ✕
                    </button>
                </div>
            </header>

            {/* Scrollable Main Area (Files or Massive Upload) */}
            <main style={{
                position: 'relative', zIndex: 10, flex: 1,
                overflowY: 'auto', padding: '16px', paddingBottom: '200px', // Extra padding for bottom sheet
                display: 'flex', flexDirection: 'column', gap: '12px'
            }}>
                <input type="file" ref={fileInputRef} onChange={handleFileInput} style={{ display: 'none' }} multiple accept="image/*, application/pdf" />

                {files.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px 8px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <span style={{ fontSize: '0.8rem', color: '#888', fontWeight: 600 }}>{files.filter(f => f.selected).length} of {files.length} Selected</span>
                        <button onClick={toggleSelectAll} disabled={isProcessing} style={{
                            background: files.some(f => !f.selected) ? 'rgba(10, 150, 255, 0.15)' : 'rgba(255,255,255,0.05)',
                            color: files.some(f => !f.selected) ? '#0a96ff' : '#888',
                            border: `1px solid ${files.some(f => !f.selected) ? 'rgba(10, 150, 255, 0.3)' : 'transparent'}`,
                            padding: '6px 16px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 800, transition: 'all 0.2s',
                            cursor: isProcessing ? 'not-allowed' : 'pointer', opacity: isProcessing ? 0.5 : 1
                        }}>
                            {files.every(f => f.selected) ? 'DESELECT ALL' : 'SELECT ALL'}
                        </button>
                    </div>
                )}

                {files.length === 0 ? (
                    /* Mobile Immersive Upload Zone */
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            vibrate(30);
                            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                                addFiles(Array.from(e.dataTransfer.files));
                            }
                        }}
                        style={{
                            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            background: 'radial-gradient(circle at center, rgba(10, 150, 255, 0.1) 0%, rgba(0,0,0,0) 70%)',
                            border: '2px dashed rgba(10, 150, 255, 0.4)', borderRadius: '32px',
                            padding: '2rem', textAlign: 'center', cursor: 'pointer',
                            minHeight: '60vh', marginTop: '20px'
                        }}>
                        <div style={{ background: 'rgba(10, 150, 255, 0.15)', padding: '24px', borderRadius: '50%', marginBottom: '24px', boxShadow: '0 0 40px rgba(10, 150, 255, 0.2)' }}>
                            <UploadCloud size={48} color="#0a96ff" />
                        </div>
                        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px', color: '#fff' }}>Tap or Drag & Drop Multiple Files</h2>
                        <p style={{ color: '#888', fontSize: '0.9rem', maxWidth: '250px' }}>Securely bulk compress Img & PDF documents instantly on your device.</p>
                    </div>
                ) : (
                    /* Compact File List */
                    files.map(file => (
                        <FileCard
                            key={file.id} file={file} targetSizeKB={targetSizeKB}
                            onRemove={removeFile} onProcess={processFile} onDownload={downloadFile} onToggleExpand={toggleExpand}
                            onToggleSelect={toggleSelect} onRename={renameFile}
                        />
                    ))
                )}
            </main>

            {/* Floating 'Add More' Button (Visible only when files exist) */}
            {files.length > 0 && (
                <button onClick={() => fileInputRef.current?.click()} style={{
                    position: 'fixed', bottom: '160px', right: '16px', zIndex: 100,
                    width: '56px', height: '56px', borderRadius: '28px',
                    background: '#0a96ff', color: '#000', border: 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 20px rgba(10, 150, 255, 0.5)'
                }}>
                    <Plus size={28} />
                </button>
            )}

            {/* Mobile Thumb-Zone Bottom Action Bar */}
            <div style={{
                position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 60,
                background: 'rgba(10, 10, 14, 0.95)', backdropFilter: 'blur(30px)',
                borderTop: '1px solid rgba(10, 150, 255, 0.2)',
                padding: '16px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom))',
                display: 'flex', flexDirection: 'column', gap: '16px',
                boxShadow: '0 -10px 40px rgba(0,0,0,0.8)'
            }}>

                {/* Scrollable Presets */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
                    {[
                        { label: 'Sign(50)', val: 50 },
                        { label: 'Photo(100)', val: 100 },
                        { label: 'Doc(300)', val: 300 },
                        { label: 'Aadhar(500)', val: 500 }
                    ].map(p => (
                        <button key={p.label} onClick={() => setTargetSizeKB(p.val)} style={{
                            flexShrink: 0, padding: '8px 16px', borderRadius: '20px',
                            background: targetSizeKB === p.val ? '#0a96ff' : 'rgba(255,255,255,0.05)',
                            color: targetSizeKB === p.val ? '#000' : '#aaa',
                            border: `1px solid ${targetSizeKB === p.val ? '#0a96ff' : 'rgba(255,255,255,0.1)'}`,
                            fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s'
                        }}>
                            {p.label}
                        </button>
                    ))}
                </div>

                {/* Primary Controls Row */}
                <div style={{ display: 'flex', gap: '12px', alignItems: 'stretch' }}>
                    {/* Target Size Input Box */}
                    <div style={{ position: 'relative', width: '100px', flexShrink: 0 }}>
                        <input type="number" value={targetSizeKB} onChange={e => setTargetSizeKB(Number(e.target.value))} style={{
                            width: '100%', height: '48px', background: 'rgba(0,0,0,0.5)',
                            border: '1px solid rgba(10, 150, 255, 0.4)', borderRadius: '12px',
                            color: '#fff', fontSize: '1.2rem', fontWeight: 700, padding: '0 32px 0 12px', outline: 'none'
                        }} />
                        <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666', fontSize: '0.7rem', fontWeight: 800 }}>KB</span>
                    </div>

                    {/* Massive Action Button */}
                    <button
                        onClick={
                            compiledZipBlob ? downloadCompiledZip :
                                allSelectedSuccess ? compileAllZip : processAll
                        }
                        disabled={isProcessing || !hasSelected}
                        style={{
                            flex: 1, height: '48px', borderRadius: '12px', border: 'none',
                            background: compiledZipBlob ? '#0aff6a' : (allSelectedSuccess ? 'rgba(10, 255, 106, 0.2)' : (hasPendingSelected ? '#0a96ff' : 'rgba(255,255,255,0.1)')),
                            color: compiledZipBlob ? '#000' : (allSelectedSuccess ? '#0aff6a' : (hasSelected ? '#000' : '#888')),
                            fontSize: '1rem', fontWeight: 800,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            opacity: isProcessing || !hasSelected ? 0.3 : 1,
                            animation: (hasPendingSelected || compiledZipBlob) && !isProcessing ? 'pulseBlueBtn 2s infinite' : 'none',
                            transition: 'background 0.3s, color 0.3s'
                        }}
                    >
                        {isProcessing ? 'PROCESSING...' :
                            compiledZipBlob ? <><Download size={18} /> DOWNLOAD ZIP</> :
                                allSelectedSuccess ? <><Archive size={18} /> COMPILE ZIP</> : 'COMPRESS BATCH'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SarkariCompress;
