# Neural Writer Expansion Plan: "The Word Hacker Suite"

## 1. Core Philosophy: "Cyber-Linguistics"
We are not building a boring office tool like QuillBot or Grammarly. We are building a **Cyber-Linguistic Terminal**.
- **Visuals**: Dark, Neon, Glitch effects, Terminal fonts.
- **UX**: Fast, keyboard-centric, "Command Center" feel.
- **Privacy**: Local-first checks where possible, Cloud only for heavy lifting.

## 2. Feature Modules & Tech Stack

### Module A: The "Re-Coder" (Advanced Paraphraser)
*Evolution of the current Neural Editor.*
- **Function**: Rewrites text with specific "Modes".
- **Modes**:
  - **Standard**: Balanced rewrite.
  - **Stealth**: Make it sound more human (bypass AI detectors).
  - **Cipher**: Shorten text (Twitter/SMS style).
  - **Academic**: Formal, complex vocabulary.
- **Tech Stack**:
  - **Engine**: Existing Cloudflare AI Gateway.
  - **Prompt Engineering**: Dynamic system prompts based on selected mode.
  - **UI**: Split view (Source <-> Output) with "Freeze" capability (lock certain words).

### Module B: The "Syntax Scanner" (Grammar & Spell Check)
*Real-time error detection without sending everything to the cloud.*
- **Function**: Highlights spelling, grammar, and passive voice issues.
- **Tech Stack**:
  - **Local Engine**: `unified` + `retext` ecosystem (`retext-english`, `retext-spell`, `retext-equality`).
    - *Why?* Runs 100% in the browser. Zero latency. Private.
  - **Deep Scan**: Optional "Cloud Fix" button using AI Gateway for complex sentence structure repairs.
- **UI**:
  - **Visuals**: Neon Red underlines for errors, Neon Yellow for warnings.
  - **Interaction**: Hover to see a "Glitch Tooltip" with the fix. Click to apply.

### Module C: The "Origin Tracer" (AI Detector)
*Analyze text to determine if it was written by a machine.*
- **Function**: Gives a "Synthetic Score" (0% - 100%).
- **Tech Stack**:
  - **Engine**: AI Gateway (Perplexity Analysis).
  - **Method**: We ask the AI to evaluate the text's "burstiness" and "perplexity". High predictability = AI. Low predictability = Human.
- **UI**:
  - **Visuals**: A "Threat Level" Gauge.
    - Green: Human (Safe).
    - Red: AI (Detected).
  - **Detail**: Heatmap highlighting "Robot Phrases".

### Module D: The "Echo Finder" (Plagiarism/Similarity)
*Check for duplicate content.*
- **Constraint**: Real "Internet Plagiarism" checking requires expensive APIs (Copyscape/Turnitin).
- **Our Solution**: **"Cross-Reference Mode"**.
  - User pastes "Reference Text" (e.g., a Wikipedia article).
  - User writes their essay.
  - System checks how much overlaps with the Reference.
- **Tech Stack**:
  - **Algo**: `diff-match-patch` (Google's library) + Cosine Similarity algorithm (Client-side).
- **UI**:
  - Side-by-side comparison with matching text glowing in **Neon Blue**.

## 3. UI/UX Architecture: "The Deck"

Instead of a boring tab bar, we use a **"Cyber Deck"** switcher.

```
[ RE-CODER ] [ SYNTAX ] [ TRACER ] [ ECHO ]
```

- **Main View**: The central text editor is persistent. Switching modules changes the *sidebar* and the *analysis layer*, but the text remains.
- **The "HUD" (Heads Up Display)**:
  - Floating stats: Word Count, Readability Score (Flesch-Kincaid), Synthetic Score.

## 4. Implementation Roadmap

### Phase 1: The Foundation (Current)
- [x] Basic AI Connection (Gateway).
- [x] Split Screen UI.

### Phase 2: The Syntax Engine (Grammar)
- [ ] Install `retext` libraries.
- [ ] Create `GrammarOverlay` component (highlights errors over text).
- [ ] Implement "Fix" logic.

### Phase 3: The Advanced Re-Coder (Paraphrase Modes)
- [ ] Add "Mode Selector" (Stealth, Formal, etc.).
- [ ] Update `groq.ts` to handle different system prompts.

### Phase 4: The Detectors (AI & Plagiarism)
- [ ] Implement Perplexity Check (AI Detect).
- [ ] Implement Local Similarity Check.

## 5. Immediate Next Step
**Build Phase 2 (Syntax Engine)**. This adds the "Grammarly" capability immediately using high-performance local libraries.
