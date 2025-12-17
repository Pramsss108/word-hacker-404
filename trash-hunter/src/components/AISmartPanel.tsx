import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

interface SmartSuggestion {
    file: {
        path: string;
        name: string;
        is_dir: boolean;
    };
    reason: string;
    confidence: number;
}

interface Props {
    query: string;
    onFileClick: (path: string) => void;
}

export default function AISmartPanel({ query, onFileClick }: Props) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<SmartSuggestion[]>([]);
    const [progress, setProgress] = useState(0);
    const [message, setMessage] = useState("");

    // Messages for engaging UX
    const messages = [
        "🔍 Understanding your search...",
        "🧠 Thinking about best matches...",
        "✨ Finding perfect results...",
        "🎯 Almost there..."
    ];

    useEffect(() => {
        if (!query || query.length < 2) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        setProgress(0);
        setSuggestions([]);

        // Simulate progress with rotating messages
        let currentMsg = 0;
        const progressInterval = setInterval(() => {
            setProgress(p => Math.min(p + 10, 90));
            setMessage(messages[currentMsg % messages.length]);
            currentMsg++;
        }, 300);

        // Call AI suggestions API
        invoke<SmartSuggestion[]>("get_smart_suggestions", { query })
            .then(results => {
                clearInterval(progressInterval);
                setProgress(100);
                setSuggestions(results);
                setLoading(false);
            })
            .catch(err => {
                console.error("AI suggestions error:", err);
                clearInterval(progressInterval);
                setLoading(false);
            });

        return () => clearInterval(progressInterval);
    }, [query]);

    // Idle state
    if (!query || query.length < 2) {
        return (
            <div className="ai-panel-idle">
                <div className="ai-icon">🤖</div>
                <h3>Smart Suggestions</h3>
                <p>Type to get AI-powered recommendations</p>
                <div className="ai-tip">
                    💡 I'll find the best matches for you!
                </div>
            </div>
        );
    }

    // Loading state
    if (loading) {
        return (
            <div className="ai-panel-loading">
                <div className="ai-icon">🤖</div>
                <h3>Analyzing...</h3>

                <div className="progress-bar">
                    <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <p className="ai-message">{message}</p>

                <div className="ai-tip">
                    {Math.ceil((100 - progress) / 30)} seconds remaining
                </div>
            </div>
        );
    }

    // Results state
    return (
        <div className="ai-panel-results">
            <div className="ai-header">
                <span className="ai-icon">🤖</span>
                <h3>Smart Suggestions</h3>
            </div>

            {suggestions.length === 0 ? (
                <p className="no-suggestions">No smart picks found</p>
            ) : (
                <>
                    <p className="ai-subtitle">⭐ Top Picks:</p>
                    <div className="suggestions-list">
                        {suggestions.map((sug, idx) => (
                            <div
                                key={idx}
                                className="suggestion-item"
                                onClick={() => onFileClick(sug.file.path)}
                            >
                                <div className="suggestion-header">
                                    <span className="suggestion-icon">
                                        {sug.file.is_dir ? "📁" : "📄"}
                                    </span>
                                    <span className="suggestion-name">{sug.file.name}</span>
                                </div>

                                <div className="suggestion-meta">
                                    <span className="suggestion-reason">{sug.reason}</span>
                                    <div className="confidence-bar">
                                        <div
                                            className="confidence-fill"
                                            style={{ width: `${sug.confidence}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
