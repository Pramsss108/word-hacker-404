# ⚔️ Neural Writer vs. The Giants: Feature Gap Analysis

| Feature | 🟢 Grammarly | 🔵 QuillBot | 🔴 Word Hacker 404 (Current) | 🚀 Planned Upgrade |
| :--- | :--- | :--- | :--- | :--- |
| **Core Engine** | Proprietary AI | Proprietary AI | **Hybrid** (Llama 3 70B + Local Rules) | **Hybrid V2** (Cloudflare Gateway + WebLLM) |
| **Grammar Check** | Excellent | Good | **Basic** (Retext JS Rules) | **Advanced** (Llama 3 "Fluency" Mode) |
| **Paraphrasing** | Limited | **Excellent** (7 Modes) | **Good** (4 Modes: Fix, Formal, Shorten, Enhance) | **Excellent** (Add Creative, Simple, Expand Modes) |
| **Tone Detection** | Yes (Emoji based) | Limited | **Yes** (AnalysisEngine.ts) | **Real-time** (Sentiment Analysis) |
| **Synonyms** | Double-click word | Click to change | ❌ **Missing** | **Contextual Thesaurus** (Click word -> AI suggests) |
| **Plagiarism** | Premium Only | Premium Only | ❌ **Missing** | ❌ **Out of Scope** (Requires massive DB) |
| **Citations** | Yes | Yes | ❌ **Missing** | ⏳ **Future** (Auto-format MLA/APA) |
| **Privacy** | Cloud-based | Cloud-based | **High** (Local Mode available) | **Maximum** (No logs on Gateway) |
| **Platform** | Browser Ext / App | Web / Ext | **Web App** (PWA) | **Desktop App** (Tauri - Planned) |
| **Cost** | Free / $12/mo | Free / $9/mo | **Free** (Open Source) | **Free** (Donation / Pro License) |
| **Offline Use** | No | No | **Yes** (Ollama Mode) | **Yes** (WebLLM / Ollama) |

## 🧠 Implementation Phases (Updated)

### Phase 1: The Foundation (✅ DONE)
- [x] Split-Screen UI (Input vs Output)
- [x] Diff View (Visual changes)
- [x] Basic Stats (Readability, Word Count)
- [x] Cloud Brain Integration (Groq via Gateway)

### Phase 2: The "QuillBot Killer" Features (🚧 IN PROGRESS)
- [ ] **Synonym Swapper**: Click a word in the output to see AI-generated synonyms.
- [ ] **More Modes**: Add "Expand" (make longer), "Simplify" (ELI5), and "Creative" (Storyteller).
- [ ] **Freeze Words**: Prevent specific words (proper nouns) from being changed.

### Phase 3: The "Grammarly Killer" Features
- [ ] **Real-time Underlining**: Red underline for grammar, Blue for style (using `retext` more aggressively).
- [ ] **Hover Explanations**: "Why is this wrong?" tooltips.
- [ ] **One-Click Fixes**: Accept changes individually rather than all-at-once.

### Phase 4: The "Cyberpunk" Edge
- [ ] **Voice Mode**: Dictate text like a hacker log.
- [ ] **Sound FX**: Mechanical keyboard sounds, UI chirps.
- [ ] **Stealth Mode**: "Boss Key" to instantly switch to a fake spreadsheet.
