# 🧠 PROJECT: NEURAL WRITER (The "QuillBot Killer")
## 🚀 Strategic Pivot: Hybrid AI + Rule-Based Engine

### 1. Executive Summary
**Objective**: Build a **Privacy-First, Offline-Capable** writing assistant.
**Architecture**: Tauri (Rust) + React. **No Python/Java dependencies** to keep it lightweight.
**Philosophy**: "Rules for Speed, AI for Magic."

---

### 2. The "Hybrid" Engine Architecture

We will not rely solely on AI. We will use a 3-Layer Stack to match Grammarly's performance.

#### 🟢 Layer 1: The "Reflex" Engine (Instant & Offline)
*   **Tech**: TypeScript / Regex / Lightweight JS Libraries.
*   **Function**: Runs on every keystroke. Zero latency.
*   **Capabilities**:
    *   **Readability Scores**: Uses `flesch-kincaid` (JS lib) to detect hard sentences.
    *   **Passive Voice**: Regex patterns to catch "was done by", "is being".
    *   **Repetition**: Simple word frequency counter.
    *   **Basic Typos**: Browser's built-in spellcheck API.

#### 🟡 Layer 2: The "Local" Brain (Offline AI)
*   **Tech**: **Ollama** (User must have it installed) running `mistral` or `llama3`.
*   **Function**: Heavy lifting without internet.
*   **Capabilities**:
    *   Paraphrasing (QuillBot style).
    *   Offline Grammar checks.

#### 🔴 Layer 3: The "Cloud" Overlord (Online Turbo)
*   **Tech**: **Groq Cloud** (Llama 3 70B).
*   **Function**: When user wants "Perfect" results and has internet.
*   **Capabilities**:
    *   Deep nuance analysis.
    *   "Cyberpunk" creative rewriting.
    *   Complex formatting.

---

### 3. Core Features (The "Killer" Modules)

#### 🅰️ Module A: "The Sentinel" (Grammar & Style)
*   **Visuals**: Red underline (Error), Yellow underline (Style/Passive).
*   **Implementation**:
    *   *Fast Path*: JS checks for sentence length > 25 words.
    *   *Slow Path*: Send paragraph to AI: "Find grammar errors in JSON format."

#### 🅱️ Module B: "The Alchemist" (Rewriter)
*   **QuillBot Clone**:
    *   **Fluency**: Fixes mistakes.
    *   **Formal**: Removes slang.
    *   **Shorten**: Cuts fluff.
*   **Tech**: Calls `http://localhost:11434/api/generate` (Ollama) OR Groq API.

#### ©️ Module C: "The Architect" (Formatter)
*   **Function**: Markdown beautifier.
*   **Tech**: AI-based structure analysis.

---

### 4. Step-by-Step Implementation Plan

#### 🟢 Phase 1: The "Reflex" Layer (JS Only) (✅ DONE)
1.  **Install Libs**: `npm install text-readability retext retext-passive retext-simplify`.
2.  **Create `AnalysisEngine.ts`**:
    *   Implement `getReadabilityScore(text)`.
    *   Implement `detectPassiveVoice(text)`.
3.  **UI**: Show a "Scorecard" in the sidebar (Grade Level, Word Count, Tone).

#### 🟡 Phase 2: The Interface (Split-Screen) (✅ DONE)
1.  **Layout**: Left = Input (Textarea), Right = Output (Diff View).
2.  **Diff Engine**: Use `diff-match-patch` to highlight changes.

#### 🟠 Phase 3: The AI Integration (Cloudflare Gateway) (✅ DONE)
1.  **Gateway**: Use `https://ai-gateway.word-hacker-404.workers.dev` (Protected API).
2.  **Service**: Update `groq.ts` to use Gateway + Secret (No user API key needed).
3.  **Settings**: Simplify `SettingsModal` to show connection status only.

#### 🟣 Phase 4: UX & "QuillBot" Features (🚧 NEXT)
1.  **Quick Actions**: Copy, Accept, Clear (✅ DONE).
2.  **Synonyms**: Click word to replace.
3.  **Modes**: Add Expand, Simplify.

---

### 5. Monetization & Future (The "Bong Bari" Angle)
*   **Student Mode**: Special prompt to "Explain like I'm 5" or "Academic Format".
*   **Bengali Support**: Llama 3 is decent at Bengali. We can add a "Translate & Polish" mode.
*   **Privacy Pro**: The ultimate selling point. "We don't send your essays to the cloud."

---

### 6. Execution Checklist for Agent
- [x] **Scaffold**: Create `NeuralEditor` component structure.
- [x] **Logic**: Implement `AnalysisEngine.ts` (The JS Rules).
- [x] **UI**: Build the Split-Screen Diff Viewer.
- [x] **UI Polish**: Fix layout bugs and styling issues.
- [x] **AI**: Connect Rewrite buttons to Cloudflare Gateway.
    - [x] Update `src/services/groq.ts` to use Gateway.
    - [x] Remove API Key input from `SettingsModal.tsx`.
- [x] **UX Enhancements**:
    - [x] Fix "Half Screen" bug.
    - [x] Add "Quick Actions" (Copy, Accept, Clear).
- [ ] **Advanced Features**:
    - [ ] **Synonyms**: Contextual replacement.
    - [ ] **Voice**: Dictation Mode.
    - [x] Wire up `NeuralEditor.tsx` to use these services.

### 7. Next Steps (Phase 4: UX & "The Missing Link")
- [x] **Settings UI (Critical)**:
    - [x] Add a "Gear" icon or make the Status Indicator clickable.
    - [x] Create a Modal to input Groq API Key.
    - [x] Show instructions for installing Ollama.
- [ ] **Quick Actions (UX)**:
    - [ ] **Copy Result**: Button to copy the right pane.
    - [ ] **Accept Changes**: Button to move Right Pane text -> Left Pane.
    - [ ] **Clear All**: Reset the editor.
- [ ] **Voice Mode**:
    - [ ] Add Microphone button to Input Pane.
    - [ ] Use Web Speech API for dictation.
- [ ] **Cyberpunk Polish**: Add sound effects on button clicks.
    - [ ] Create `src/services/groq.ts` (Cloud).
    - [ ] Wire up `NeuralEditor.tsx` to use these services.