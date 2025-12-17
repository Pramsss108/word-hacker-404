import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface OllamaStatus {
    installed: boolean;
    models: string[];
    needs_setup: boolean;
}

export function FirstRunWizard({ onComplete }: { onComplete: () => void }) {
    const [step, setStep] = useState<"checking" | "error_ollama" | "installing_brain" | "done">("checking");
    // const [progress, setProgress] = useState(0);
    const [statusText, setStatusText] = useState("Initializing cleanup protocols...");

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            setStatusText("Scanning for Neural Core...");
            const status = await invoke<OllamaStatus>("check_ollama_status");
            console.log("Create Status:", status);

            if (!status.installed) {
                setStep("error_ollama");
                return;
            }

            if (status.needs_setup) {
                setStep("installing_brain");
                startDownload();
            } else {
                completeSetup();
            }
        } catch (e) {
            console.error("Setup Check Failed:", e);
            setStep("error_ollama"); // Assume worst if backend fails
        }
    };

    const startDownload = async () => {
        try {
            // Trigger the download
            setStatusText("Downloading Neural Weights (Dolphin-Llama3)...");

            // Listen for progress events? For now we just know it launched a terminal window
            await invoke("download_ollama_model", { modelName: "dolphin-llama3" });

            // Poll for completion every 5 seconds
            const interval = setInterval(async () => {
                const status = await invoke<OllamaStatus>("check_ollama_status");
                if (!status.needs_setup) {
                    clearInterval(interval);
                    completeSetup();
                }
            }, 5000);

        } catch (e) {
            console.error("Download Trigger Failed:", e);
            setStatusText("Download failed. Please try again.");
        }
    };

    const completeSetup = () => {
        setStep("done");
        setTimeout(onComplete, 1500);
    };

    if (step === "done") {
        return (
            <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center animate-fade-out">
                <div className="text-green-500 text-4xl mb-4">✅</div>
                <div className="text-white font-mono text-xl">SYSTEM READY</div>
            </div>
        );
    }

    if (step === "error_ollama") {
        return (
            <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-16 h-16 border-2 border-red-500 rounded-full flex items-center justify-center mb-6">
                    ⚠️
                </div>
                <h2 className="text-2xl text-red-500 font-bold mb-4">AI Core Missing</h2>
                <p className="text-white/70 max-w-md mb-8">
                    Trash Hunter requires <b>Ollama</b> to function. Only the shell was detected.
                    Please install the AI Runtime to continue.
                </p>
                <div className="flex gap-4">
                    <a
                        href="https://ollama.com/download"
                        target="_blank"
                        className="px-6 py-3 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors"
                    >
                        Download Ollama
                    </a>
                    <button
                        onClick={checkStatus}
                        className="px-6 py-3 border border-white/20 text-white rounded hover:bg-white/10 transition-colors"
                    >
                        I Installed It, Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
            {/* Cyberpunk Loader */}
            <div className="relative w-24 h-24 mb-8">
                <div className="absolute inset-0 border-t-2 border-l-2 border-cyan-500 rounded-full animate-spin"></div>
                <div className="absolute inset-2 border-r-2 border-b-2 border-purple-500 rounded-full animate-spin-reverse"></div>
            </div>

            <h2 className="text-xl text-cyan-400 font-mono tracking-widest mb-2">
                {step === "installing_brain" ? "INSTALLING AI MODEL" : "SYSTEM CHECK"}
            </h2>

            <p className="text-white/50 text-sm font-mono animate-pulse">
                {step === "installing_brain"
                    ? "Check the external terminal window..."
                    : statusText}
            </p>

            {step === "installing_brain" && (
                <div className="mt-8 text-xs text-yellow-500/50 bg-yellow-500/10 px-4 py-2 rounded">
                    Do not close the "Ollama" terminal until it reaches 100%
                </div>
            )}
        </div>
    );
}
