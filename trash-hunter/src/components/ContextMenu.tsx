import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invoke } from "@tauri-apps/api/core";

interface ContextMenuProps {
    x: number;
    y: number;
    file: { path: string; name: string; is_dir: boolean };
    onClose: () => void;
    onDeleted?: () => void; // Callback to refresh list
}

export default function ContextMenu({ x, y, file, onClose, onDeleted }: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null);
    const [actionStatus, setActionStatus] = useState<string | null>(null);

    // Close on click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [onClose]);

    const handleAction = async (action: string) => {
        try {
            if (action === "Open") {
                await invoke("open_file", { path: file.path });
                onClose();
            } else if (action === "Show in Explorer") {
                await invoke("show_in_explorer", { path: file.path });
                onClose();
            } else if (action === "Copy Path") {
                await navigator.clipboard.writeText(file.path);
                onClose();
            } else if (action === "Copy Image") {
                setActionStatus("Copying Image...");
                await invoke("copy_image_to_clipboard", { path: file.path });
                onClose();
            } else if (action === "Delete") {
                if (confirm(`Delete ${file.name}? (Permanent)`)) {
                    setActionStatus("Deleting...");
                    await invoke("delete_items", { paths: [file.path] });
                    onDeleted?.();
                    onClose();
                }
            } else if (action === "AskAI") {
                setActionStatus("Analyzing...");
                const result = await invoke<string>("analyze_file_safety", { path: file.path });
                setActionStatus(result);
                // Don't close immediately so user can read
                return; 
            } else {
                console.warn("Unimplemented action:", action);
                onClose();
            }
        } catch (e) {
            console.error("Context Action Failed:", e);
            alert(`Error: ${e}`);
            onClose();
        }
    };

    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(file.name);

    return createPortal(
        <div
            ref={ref}
            className="fixed z-[9999] w-48 bg-[#0a0a0a] border border-white/10 rounded-lg shadow-2xl flex flex-col py-1 text-xs text-gray-300 backdrop-blur-md"
            style={{ top: y, left: x }}
        >
            <div className="px-3 py-2 border-b border-white/5 text-neon-cyan/80 font-mono truncate">
                {file.name}
            </div>

            <MenuItem label="Open" shortcut="Enter" onClick={() => handleAction("Open")} />
            <MenuItem label="Show in Explorer" onClick={() => handleAction("Show in Explorer")} />
            <div className="h-[1px] bg-white/5 my-1" />

            <MenuItem label="Copy Path" onClick={() => handleAction("Copy Path")} />
            {isImage && (
                <MenuItem label="Copy Image" onClick={() => handleAction("Copy Image")} />
            )}

            <div className="h-[1px] bg-white/5 my-1" />
            <MenuItem label="Delete" color="text-red-400" onClick={() => handleAction("Delete")} />
            
            <div className="h-[1px] bg-white/5 my-1" />
            <MenuItem label="Ask AI: Is it safe?" color="text-neon-cyan" onClick={() => handleAction("AskAI")} />

            {actionStatus && (
                <div className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center text-white p-4 text-center z-50 rounded-lg">
                    {actionStatus === "Analyzing..." ? (
                        <>
                            <div className="animate-spin text-2xl mb-2">🧠</div>
                            <div className="text-xs font-mono animate-pulse">Consulting Neural Net...</div>
                        </>
                    ) : (
                        <div className="text-xs font-mono leading-relaxed">
                            {actionStatus}
                            <button 
                                onClick={() => setActionStatus(null)}
                                className="mt-3 px-3 py-1 bg-white/10 hover:bg-white/20 rounded text-[10px] uppercase tracking-widest w-full"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>,
        document.body
    );
}

function MenuItem({ label, shortcut, color, onClick }: { label: string, shortcut?: string, color?: string, onClick: () => void }) {
    return (
        <button
            className={`w-full text-left px-3 py-2 hover:bg-white/10 flex justify-between items-center ${color || "text-gray-300"}`}
            onClick={onClick}
        >
            <span>{label}</span>
            {shortcut && <span className="text-[10px] text-white/20">{shortcut}</span>}
        </button>
    );
}
