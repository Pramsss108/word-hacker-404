# Master Polish, AI Kill & Delivery Protocol — Shrijani Dutta

Every Shrijani Dutta article goes through **TWO files only** before submission:

| File | Job |
|---|---|
| `_MASTER_WRITING_RULES.md` | **Phase 1** — Generate v1 from scratch |
| `_MASTER_POLISH_REVIEW.md` **(THIS FILE)** | **Phase 2** — Full audit + AI Kill loop + final delivery |

This file does everything after generation: rules audit, surgical polish, autonomous AI score loop, dual-gate validation, and final sign-off. The user never manually tests on ZeroGPT — this file runs it all.

---

## ⚠️ AGENT CONTRACT (READ FIRST)

You receive the Phase 1 draft. You run this file top to bottom, autonomously, without waiting for user input between steps. Your full job:

1. **Section 3 audit** — every rule, every box, no skipping.
2. **Surgical polish** — fix only what fails. Leave proven-clean sentences alone.
3. **AI Kill loop** — run `zerogpt_check.py` autonomously, iterate with dual-gate validation until ZeroGPT < 15% or 6 rounds hit.
4. **Final delivery** — updated article file + full report.

**You do not stop between steps to ask the user anything. You deliver once: when both gates are green.**

---

## 🔒 DELIVERY PROTOCOL — MANDATORY PHASE 2 RECEIPT (NO SKIPPING, NO SUMMARISING)

**Why this exists:** Phase 1 already requires a printed receipt (see top of `_MASTER_WRITING_RULES.md`). Phase 2 must close the loop with its own receipt. The agent has been caught saying "all good, pushing" without actually re-running the structural / numeric / token scans after the ZeroGPT rewrites. From now on, paste this filled receipt in chat BEFORE running `git push`. Pushing without it = REJECT (revert the commit).

```
═══════════════════════════════════════════════════════════
PHASE 2 RECEIPT — paste FILLED in chat before git push
═══════════════════════════════════════════════════════════

── A. STRUCTURE STILL INTACT AFTER REWRITES ──
[ ] H1 unchanged (or, if rewritten for length, still 30–60 chars and starts with focus KW)
[ ] All 3 `---` dividers still present: after intro, between H2s, before `## Sources`
[ ] All 3 EMBED HTML comments still present, in order
[ ] Sources block with ≥5 URLs still present
[ ] SoapCentral CTA still present, exact spelling, italicised
[ ] QA receipt line at bottom, score updated from `TBD` to real %

── B. NUMERIC GATES STILL GREEN ──
[ ] Body words: ___ (680–730)
[ ] Body KW count: ___ | density ___% (1.0–1.5%)
[ ] RankMath density ___% (< 1.5%)
[ ] Over30: 0 | Over25: ≥4 | 15–25: ≥8 | Under10: ≤6 | MaxConsecUnder8: ≤2
[ ] Apostrophes: 0 | Em dashes: 0 | Lowercase hyphens: 0

── C. AI KILL LOOP RESULT ──
[ ] ZeroGPT score this run: ___% (must be < 15%)
[ ] Round count: ___ (loop runs in `zerogpt_check.py`, max 6 rounds)
[ ] Flagged sentences remaining in last run: ___ (acceptable so long as overall < 15%)
[ ] Score trail across rounds (oldest → newest): __% → __% → __%

── D. RULES SCAN RE-RUN AFTER REWRITES ──
[ ] Rule 2.14 banned phrases: 0
[ ] Rule 2.15 banned phrases: 0
[ ] Rule 2.16 SoapCentral CTA: present + correctly spelled *SoapCentral* + placed right before `---` divider before `## Sources`
[ ] Rule 2.17 banned trailing phrases (passive `was something / ended up being / turned out to be / stood as / served as`): 0
[ ] Rule 2.18 banned writerly closers (`feels handmade / breathes through / in the corners where / at the edges of / beneath the surface / under the skin / wears its heart / earns every minute / sits at the intersection / lands somewhere between`): 0
[ ] AI red-flag vocabulary: 0
[ ] British English: 0
[ ] H3/H4: 0
[ ] **Section 3.6 quality check passed: no duplicate anchor facts across paragraphs, every sentence reads clean aloud, subject-verb agreement intact**

── E. PUSH PREP ──
[ ] Helper / temp scripts deleted (`_tmp_verify.py` and friends are NOT in the commit)
[ ] Only `samples/<slug>.md` is staged (no stray files, no rules changes unless intended)
[ ] Commit message follows pattern: `feat(samples): <topic> | <wc>w | <density>% | ZeroGPT <score>%`
[ ] Author email + name set inline: `agent@wordhacker.local` / `WordHacker Agent`

══════════════════════════════════════════════════════════
If ANY box above reads `✗`: STOP. Fix locally. Re-run the
ZeroGPT and stats scans. Paste a NEW receipt. Do NOT push.
══════════════════════════════════════════════════════════
```

**Reminder:** every `git push` to `Pramsss108/article-workspace` is a public artefact under the user's name. A skipped checklist line is the user's reputation, not yours. No exceptions, no "I'm pretty sure it's fine", no batching multiple articles to save time.

---

## 1. The Workflow

```
USER: "write article on [topic], KW [keyword]"
        │
        ▼
[PHASE 1] _MASTER_WRITING_RULES.md
Generate v1 + self-audit
        │
        ▼
[PHASE 2] THIS FILE — runs fully autonomous, no user input needed mid-run
    │
    ├─ STEP A: Section 3 Audit (hard-fails, structure, formatting, sourcing, anti-AI)
    │   Fix all violations surgically. Leave clean sentences alone.
    │
    ├─ STEP B: AI Kill Loop (see Section 14 for the exact battle-tested recipe)
    │   Run zerogpt_check.py → get SCORE + FLAGGED_SENTENCES (actual <mark> text)
    │   Apply Section 11 + Section 14.3 kill patterns to flagged sentences ONLY
    │   Run Rules Gate (Section 12 / Section 14.4) — fix any violations introduced
    │   Re-run zerogpt_check.py
    │   Repeat until SCORE < 15% OR 6 rounds hit (proven: 9 rounds, 46.3% → 10.2%)
    │
    └─ STEP C: Final Delivery
        Section 3 audit: ALL PASS
        Score: < 15% confirmed by zerogpt_check.py
        Deliver article + full report (Section 13)
        │
        ▼
USER pastes 3 embed codes → Submit to Sportskeeda
```

---

## 2. Inputs You Need from the User Before Starting Stage 2

Before doing any polish, confirm or request these from the user:

- ✅ The current draft file path (e.g. `articles/alexx-ekubo-movies-filmography.md`)
- ✅ The AI percentage from ZeroGPT (mandatory)
- ✅ Optional secondary scores: GPTZero, Originality.ai, Sapling, Copyleaks, Quillbot
- ✅ Optional plagiarism score (target: under 5% on Copyscape / Quetext)
- ✅ Any specific sentence the detector highlighted (paste-back of flagged spans is gold)
- ✅ Any editor feedback if the piece has already been seen by Sportskeeda

If the user only gives the percentage and no flagged spans, do the full audit yourself and infer which sentences are most likely flagged based on Rule 2.7 / 2.8 / 2.11 patterns from the master rules.

---

## 3. Stage 2 Audit (Run Top to Bottom, Every Box)

This audit is the same as Rule 9 in `_MASTER_WRITING_RULES.md` plus additional review-only checks. Do not skip a single line.

### 3.1 Hard-fail scan (auto-reject if any are true)

- [ ] **🚨 NO COMPLICATED / OVERCOOKED SENTENCES — USER'S #1 INTOLERABLE POLICY. ZERO TOLERANCE.** Read every sentence aloud. REJECT and rewrite if ANY of these are true for ANY sentence:
  - Sentence is over **30 words** (hard cap, not 45).
  - Stacks 3+ ideas in one sentence.
  - Uses banned literary connectors: "alongside", "across", "running next to", "while also", "in which", "grappling with", "set against", "all the while", "even as", participial phrase tails ("...spiraling and grief stricken arc into..."), 3+ commas chaining clauses.
  - Sounds like a press release, Wikipedia paragraph, or literary essay instead of a friend telling you about the movie over chai.
  - You have to pause to breathe mid-sentence when reading aloud.
  - **Action when found:** split into 2 plain sentences, one idea per sentence. Then sweep the rest of the draft for any similar pattern and fix all in one pass. See Rule 2.5 in `_MASTER_WRITING_RULES.md` for full examples.
  - **User feedback signal:** if user says "complicated", "eson ki lekha", "bhua", "erom keno", "press release" → P0 incident, rewrite all suspicious sentences.
- [ ] Search the body for `—` (em dash). Any usage as punctuation between words/clauses → REJECT and replace with comma, colon, or period.
- [ ] Search the body for hyphens between regular words (`career-defining`, `long-running`, `AI-humanizer`, `fast-paced`, `well-known`, `no-filter`, `rom-com`, `leading-man`). REJECT and rewrite into plain words.
- [ ] Search the body for `'` and `’`. Any contraction or possessive → REJECT and rewrite (rephrase possessives, write contractions in full).
- [ ] Confirm `---` divider IS present after the intro AND at the end of each H2 section. If missing, ADD.
- [ ] Scan every paragraph for 3 consecutive sentences under 8 words. If found, COMBINE into longer flowing sentences.
- [ ] Scan paragraph endings for 2-to-4-word punch fragments summarising a fact (the AI-humanizer fingerprint). If found, REWRITE as full sentences.
- [ ] Word count: count the body (between H1 and Sources H2). Must be inside 680–730 for a 700 target. If under, EXPAND with verified extra reactions or context. If over, TRIM the least-essential paragraph.
- [ ] Dates are PLAIN text — `May 11, 2026`, `December 2024`, `2010`. If any date is bolded in the draft (`**May 11, 2026**`), STRIP the bold. (Rule changed v3 — dates no longer bolded; numerals stand out on their own.)
- [ ] Ages and key numbers are PLAIN text — `40`, `at age 40`, `38`. If any are bolded, STRIP the bold.
- [ ] Structural variety vs the previous Shrijani Dutta article: opener shape, paragraph count distribution, H2 phrasing style, closing rhythm should NOT be identical to the last piece. If they are, vary one or more.

### 3.2 Structure & SEO checks

- [ ] **SEO title (H1) is 30 to 60 characters long AND starts with the exact focus keyword phrase.** Count the H1 character length (excluding the leading `#` and space). If it is over 60 chars OR under 30 chars OR does not begin with the focus keyword as its first words, REWRITE the H1. Pattern: `[focus keyword]: [2 to 5 word hook]` keeps it inside the window and front-loads the keyword. Example for keyword `Stuart Fails to Save the Universe`: `Stuart Fails to Save the Universe cast: HBO Max trailer` (56 chars, keyword at index 0). The Sportskeeda checker scores this as 3 points for length + 1 point for keyword in first 30 chars. Anything else loses 4 points and gets flagged red.
- [ ] Focus keyword in the first line of the intro (within first 200 characters)
- [ ] Focus keyword in the H1 (plain text, no bold/italic inside heading)
- [ ] Focus keyword in at least one H2 (plain text in heading)
- [ ] At least one H2 phrased as a question; ideally both
- [ ] Keyword density 1.3% (between 1.2% and 1.5% acceptable). If above 1.5%, swap mentions for pronouns ("the actor", "he", "the singer") to bring it down.
- [ ] Exactly 2 H2 subheadings. No H3 / H4 / H5.
- [ ] Exactly 3 embed placeholders, formatted as HTML comments, positioned roughly: one near top of intro/body, one mid-article, one near closing. Adjust if any natural pause-point makes one feel forced.
- [ ] Inverse pyramid order respected (newest / most-asked-about info up top, background lower).

### 3.3 Formatting checks (RESTRAINT — do not over-highlight)

> **Core principle (matches Master Writing Rules Section 4):** Italicise/bold a movie/show/album/book/person ONLY when the mention is important. On casual or repeat mentions, keep plain text. Over-formatting screams AI and gets editor flags for "shouty copy".

**EVERY occurrence (no exceptions):**
- [ ] Focus keyword in body → ***bold + italic*** every time (SEO-critical, density tool reads it). Not in H1/H2 — those stay plain.
- [ ] Outlet / publication / website / channel names → *italic* every time (e.g. *Variety*, *Deadline*, *NBC*, *HBO Max*). These are cite-style and look broken if inconsistent.
- [ ] Episode titles → "in quotes" every time.

**FIRST mention + emphasised mentions only (then plain text on casual repeats):**
- [ ] Real person names → **bold** on first mention and on any emphasised re-mention (new claim, quote attribution, first mention inside a new H2 section, or side-by-side contrast). Casual repeats (pronoun-substitute "the actor", surname-only echo, third namedrop in same paragraph) → plain text.
- [ ] Show / movie / album / book / song titles → **bold** on first mention and on any emphasised re-mention. Casual repeats ("the show", "the spinoff", "the soundtrack", second/third namedrop in the same paragraph) → plain text. (Rule changed v3 — was italic, now bold for better mobile readability.)

**Plain text always:**
- [ ] Character names → plain text.
- [ ] Dates, ages, key numbers → plain text. (Rule changed v3 — was bold, now plain to remove the cumbersome scatter.)

**Editor sniff test:** count bold spans in the rendered preview. If any single show name or any single person name appears bolded more than 3 times in a 700-word article, you are over-formatting. Strip the casual repeats back to plain text.

### 3.4 Anti-AI voice checks

- [ ] Zero AI red-flag words in the body: delve, navigate, crucial, robust, leverage, pivotal, moreover, furthermore, additionally, in conclusion, it is important to note, tapestry, showcase, testament, sheds light on, plays a crucial role, a wide range of, stands as a testament, in today's fast-paced world, this raises questions about
- [ ] Sentence-length distribution (Rule 2.12 of master rules):
  - At least 4 sentences over 25 words ✓
  - At least 8 sentences in 15–25 word range ✓
  - Maximum 6 sentences under 10 words across the whole article, spread out ✓
- [ ] Voice matches Vanguard / Guardian / Variety / Deadline cadence — long, fact-dense sentences with embedded clauses
- [ ] No appositive-stacked openers (Rule 2.8)
- [ ] No smooth chronological recaps reading like Wikipedia
- [ ] No parallel "X wrote that Y and that Z" reporting
- [ ] No "Then there is the X thing, which..." transitions
- [ ] No tidy summary lines like "Both of those things are probably true"
- [ ] No two-word fragment paragraph closers
- [ ] At least one casual conversational hook somewhere in the body (not the same one used in the previous article)
- [ ] At least two plain-English source attributions in the body ("according to *Vanguard*", "*The Guardian* reported"), with varied construction
- [ ] At least one mild hedging sentence (admits limits of what is known)

### 3.5 Sourcing checks

- [ ] At least 5 real sources, ideally 6–8
- [ ] Every URL live-tested (loaded and confirmed to match the claim)
- [ ] Sources section is plain URLs only, one per line, no bullets, no italics, no labels
- [ ] No similarity to source phrasing — every line in the body is original wording (run a manual check on any sentence that came too close to a quote)
- [ ] Every factual claim cross-checked via a real web search (no blind trust in another AI's output)

### 3.6 Quality check — duplicate info + prose fluency (NEW, user-locked)

> **Why this exists:** ZeroGPT and the rule scans cannot catch two things a human editor will flag instantly: (a) the same fact repeated in two paragraphs (e.g. Kirby resume listed in intro P3 AND in H2#2 P2), and (b) grammatically awkward or subject-verb-broken sentences that read clean to a regex but ugly to a reader. Run this BEFORE Phase 2 receipt.

- [ ] **Duplicate fact scan.** Pick the 4 to 6 anchor facts of the piece (e.g. for a casting story: Emmy year, co-star + platform, recent project list, birthplace + year, character name, premiere date). Search the body for each. If any anchor fact appears in TWO different paragraphs, REWRITE the second occurrence into a fresh angle (implication, contrast, audience read, production context). Do not just paraphrase the same fact twice.
- [ ] **Read every sentence aloud once.** Reject and rewrite any sentence where: subject and verb disagree (`credits that is well known`), a relative pronoun is misused (`actor which`), a clause runs out of breath, or the sentence ends mid-thought. Regex passes but ears fail = REJECT.
- [ ] **Anchor-fact placement test.** Each anchor fact lives in exactly ONE paragraph. The other paragraphs build on or react to it. If two paragraphs are both "the resume paragraph" or both "the premiere date paragraph", merge or repurpose one.

---

## 4. AI-Score-Driven Rewrite Protocol

After running the audit, factor in the user's reported AI percentage. The percentage drives HOW MUCH rewriting happens.

### 4.1 Score bands and response

| ZeroGPT % | Action |
|---|---|
| **0–10%** | DELIVER. Run a final formatting sweep, confirm hard-fails are clean, sign off. |
| **11–25%** | LIGHT SURGICAL. Rewrite only the 3–5 sentences most likely to be flagged (look for Rule 2.8 / 2.11 patterns). Do not touch the rest. |
| **26–50%** | MEDIUM SURGICAL. Rewrite 30–40% of sentences, prioritising appositive-stacked openers, encyclopedia rhythm, parallel reporting, and short-fragment punch closers. Keep the strongest human-feeling paragraphs intact. |
| **51–75%** | HEAVY REVAMP. The piece has too many AI tells. Rewrite at least one full H2 section from scratch using Rule 2.13 voice. Audit the intro line by line and reshape opener if it follows a textbook lead. |
| **76–100%** | FULL REGENERATE. Discard and rebuild the body using `_MASTER_WRITING_RULES.md` Stage 1 process, then return to Stage 2 with the new draft. |

### 4.2 Surgical rewrite priority list (in order)

When picking which sentences to rewrite first, target these AI tells in order:

1. **Appositive-stacked openers** ("X has died at 87, and an entire era of brutal criticism, the kind that ran with no filter at all, goes with him")
2. **Year + clean clause stacking** ("In 1986, when Marlee Matlin became the first deaf performer to win Best Actress, for Children of a Lesser God, Rex Reed wrote that the win was a pity vote")
3. **Three or more sentences in a row under 8 words** (the AI-humanizer fingerprint)
4. **Paragraph closers that are 2-to-4-word fact punches** ("He passed.", "Two films in 2012.")
5. **Parallel "X wrote that Y and that Z" structures**
6. **"Then there is the X thing, which..." transitions**
7. **Tidy summary meta-lines** ("Both of those things are probably true.")
8. **Encyclopedia rhythm** (three Wikipedia-style plot summary sentences in a row)

For each one, apply the fix from Rule 2.7 / 2.8 / 2.11 of the master rules. Do not introduce new AI cadence in the rewrite.

### 4.3 What NOT to do during a polish pass

- ❌ Do NOT rewrite the whole article unless the score is in the heavy / full-regenerate band. Mass rewrites destroy the human-feeling parts and raise the score.
- ❌ Do NOT swap clean human sentences for "more human" alternatives. If a sentence does not match an AI tell pattern, leave it.
- ❌ Do NOT add filler or padding to hit word count. Expand only with verified factual content.
- ❌ Do NOT introduce new sources mid-polish unless the original sourcing fails the audit.
- ❌ Do NOT change the focus keyword, the H1, or the H2 phrasing during polish unless the keyword density audit fails.

---

## 5. Plagiarism & Originality Pass

Even at 0% AI, if the piece has high plagiarism it gets rejected.

- [ ] Run the user-reported plagiarism score (if provided). Target under 5% on Copyscape / Quetext.
- [ ] If above 5%, identify which sentences are flagged and rewrite ONLY those. Reword using fresh syntax, swap quoted constructions for indirect attribution, change adjective order.
- [ ] Cross-check direct quotes from the cited sources. Quotes should be inside quotation marks and attributed in plain English (`**Funke Akindele** wrote: "..."`) — not paraphrased and presented as original.
- [ ] No source URL paraphrased word-for-word. Every body sentence must be original phrasing, even when reporting the same fact.

---

## 6. Final Embed Verification (before delivery)

- [ ] Exactly 3 `<!-- EMBED N: ... -->` HTML comments in the article
- [ ] Each embed placeholder has the real verified URL of the post (Twitter/X, Instagram, or YouTube official channel)
- [ ] User has already confirmed the embed URLs load and match the topic
- [ ] Embed comments include short instructions for the user on how to grab the embed code (open URL → ••• → Embed → Copy)

---

## 7. Stage 2 Delivery Format

After all checks pass, deliver to the user:

1. The final article file (already updated in place — do not create a new file).
2. A short polish report with this exact structure:

```
## Polish Report — [article name]
- AI score before polish: __% (ZeroGPT)
- Detectors checked: ZeroGPT [+ any others]
- Surgical band applied: [LIGHT / MEDIUM / HEAVY / FULL]
- Sentences rewritten: __ (out of __)
- Key fixes:
  - [bullet 1: e.g. "rewrote appositive-stacked intro line"]
  - [bullet 2: e.g. "combined 4 short sentences in H2 #1 into 2 flowing sentences"]
  - [bullet 3]
- Final word count: __ (target band 680–730)
- Hard-fail audit: ALL PASS
- Formatting audit: ALL PASS
- Sourcing audit: ALL PASS
- Awaiting user re-test on ZeroGPT for confirmation.
```

3. Ask the user to re-paste into ZeroGPT and confirm the score before sending to Sportskeeda. If the new score is still above target, return to Stage 2 with the new percentage and run the protocol again.

---

## 8. Pre-Submission Final Sign-Off (last step before Sportskeeda)

After the user confirms the AI score is at target, run this final sign-off pass:

- [ ] All 3 embed codes have been pasted in by the user (real Twitter / Instagram / YouTube embed HTML, not just URLs)
- [ ] Markdown preview rendered cleanly (no leftover characters, no broken formatting)
- [ ] Cover image and caption ready (Sportskeeda / Soapcentral fields)
- [ ] Sources section present and clean
- [ ] Title (H1) is the exact phrasing the editor wants in the CMS title field
- [ ] One last manual read-through, top to bottom, looking for anything that feels off

If all sign-offs pass: APPROVED FOR SUBMISSION.

---

## 9. Failure Patterns Reference

This file does NOT maintain its own failure log. It DEFERS to Section 11 of `_MASTER_WRITING_RULES.md`. Always read that table before polishing — it tells you what specific patterns the editor and the detectors have flagged in past pieces, so you do not repeat them.

When a Stage 2 polish reveals a NEW failure pattern, add a row to that table in the master rules file, not here.

---

## 10. Quick Reference — When User Says "Polish This"

1. Ask only if file path is missing: "Which article file?" — nothing else.
2. Run Section 3 audit top to bottom.
3. Fix all violations surgically.
4. Immediately start AI Kill loop (Section 11) — no user confirmation needed.
5. Loop until exit `0` or 6 rounds.
6. Deliver Section 13 report.
7. Move to Section 8 pre-submission sign-off only after score confirmed < 15%.

---

## 11. AI Kill Loop — Sentence Rewrite Rules

This runs immediately after Section 3 audit passes. No user input needed between rounds.

### Run command
```powershell
.venv\Scripts\python.exe articles/zerogpt_check.py articles/<filename>.md
```
Returns `SCORE: XX.X%` and `FLAGGED_SENTENCES: N`. Exit `0` = pass (<15%). Exit `2` = rewrite needed.

---

### Sentence Length — The Non-Negotiable Core

Fix these before targeting any other AI tell pattern. Sentence length is the #1 ZeroGPT signal.

**Three-zone system:**

| Zone | Word count | Rule |
|---|---|---|
| Short | 7–12 words | Max 1 per paragraph. Never two in a row. |
| Mid (target) | 13–28 words | At least 3 per paragraph |
| Long | 29–42 words | 1–2 per section max |

**Hard bans:**
- ❌ Any sentence under 7 words in body prose → merge into the next sentence
- ❌ Two consecutive sentences both under 12 words → combine into one
- ❌ Any sentence over 45 words → split at a natural clause break (period, not semicolon)
- ❌ Three consecutive sentences all within the same 5-word range → vary the rhythm

**Targets per 700-word article:**
- At least 4 sentences over 28 words (under 45)
- At least 10 sentences in the 13–28 word range
- Maximum 5 sentences under 12 words, spread out

**Fix example — short cluster:**
```
BAD:  "He held it. The leading man question stopped being asked."
GOOD: "He held the screen convincingly enough that the leading man
       question more or less stopped being raised inside casting rooms."
```

**Fix example — over 45 words:**
```
BAD:  "The film, built around the traditional Igbo apprenticeship
       system in a way specific to a cultural context most international
       audiences would not have encountered before, was praised by
       critics who argued it showed a more deliberate direction."

GOOD: "The film, built around the traditional Igbo apprenticeship system,
       was culturally specific in a way that did not chase a crossover
       audience. Critics who gave it serious attention argued the piece
       showed a more deliberate direction than his earlier romantic work."
```

---

### AI Tell Kill List (target in this order after sentence lengths are fixed)

**2.1 Encyclopedia opener rhythm**
Clean fact → clean expansion → clean fact. No interruption.
Fix: Add one mid-paragraph digression, contradiction, or hedged qualifier.
```
BAD:  "Lagos Cougars in 2013 was a romantic comedy. He played Chigo.
       The film tested his screen presence."
GOOD: "Lagos Cougars in 2013 was the romantic comedy test, and the test
       was not subtle: drop a young actor into a cast of veterans and see
       whether he holds his ground or fades into the furniture."
```

**2.2 Parallel list rhythm**
Three items in a row with identical sentence structure.
Fix: Break the third item out with a different construction, or combine two with a subordinate clause.
```
BAD:  "Power of 1 in 2018, Zero Hour in 2019, and The Blood Covenant in
       2022 kept his name on call sheets."
GOOD: "Power of 1 in 2018 and Zero Hour the year after kept the momentum,
       and The Blood Covenant in 2022 added a heavier dramatic register
       the lighter comedies had not asked of him."
```

**2.3 Tidy summary lines**
Paragraph ends with a one-sentence meta-observation that wraps everything up cleanly.
Fix: Replace with a specific detail that raises a small question instead of closing the loop.

**2.4 Clean chronological march**
Paragraphs move decade by decade with no flashback, contradiction, or non-linear detail.
Fix: Place one out-of-sequence detail early, or add a callback reference in a later paragraph.

**2.5 Smooth attribution pairs**
Two attribution sentences in a row with identical structure ("X said Y. Z confirmed W.")
Fix: Combine into one, or add an embedded qualifier before the second attribution.

**2.6 Phantom hedges on certain facts**
"It is worth noting that..." used on a confirmed fact.
Fix: State the fact directly. Reserve hedging for things actually uncertain.

---

### Frozen Elements — Do NOT Touch During AI Kill

- ❌ H1 and H2 headings
- ❌ Focus keyword density (1.2–1.5%)
- ❌ Sources section
- ❌ Embed placeholder comments
- ❌ Word count beyond ±30 words
- ❌ Any sentence ZeroGPT did NOT flag

---

### How many sentences to rewrite per round

| Score | Target sentences per round |
|---|---|
| 15–25% | 3–5 (sentence length clusters only) |
| 26–45% | 6–10 (lengths + 2.1 encyclopedia rhythm) |
| 46–65% | 10–15 (full H2 reshape + lengths) |
| 66–85% | 15–20 (two sections + intro) |
| 86–100% | Abandon loop. Return to Phase 1. |

---

## 12. Rules Gate — Runs After Every Rewrite Round, Before Score Check

AI Kill rewrites can accidentally introduce new violations. This gate catches them.

**Run this checklist mentally before re-running zerogpt_check.py:**

| Check | What goes wrong during AI Kill rewrites |
|---|---|
| No sentence under 7 words | Splitting a long sentence creates a fragment |
| No two consecutive sentences both under 12 words | Merging clusters short sentences together |
| No sentence over 45 words | Expanding a short sentence overshoots |
| No em dash (—) between words/clauses | Tempting when adding a clause separator |
| No hyphenated compound adjectives | Easy to slip in when rephrasing |
| No contractions or possessives | Easy to add when trying to sound casual |
| Word count still 680–730 | Every rewrite shifts the count slightly |
| All dates/ages still bolded | Bold is stripped when you rewrite the span it was in |
| All `---` dividers still present | Never removed when editing around them |

**ALL CLEAR → run zerogpt_check.py**
**ANY FAIL → fix violations first, then run score check**

A passing AI score with a rules violation is NOT a pass. Both gates must be green before the loop exits.

---

### Human Writing Benchmark — Final Check Before Delivery

For each paragraph, confirm:

1. Could a tired journalist have written this at 11pm on deadline, or does it sound like a structured AI essay? If AI essay → rewrite one sentence to add friction or specificity.
2. Is there at least one detail a generalist would NOT automatically include? If no → add one from verified sources.
3. Does the paragraph feel like it was written by someone with an opinion about what matters? If neutral → add one quietly opinionated word or hedged qualifier.

**Reference voice:** Vanguard Nigeria weekend long-reads, Guardian arts desk, Variety obituaries.

---

### Sentence Variety Fingerprint — Must Appear at Least Once in Final Article

- [ ] A sentence opening with a subordinate clause ("Although X happened, Y...")
- [ ] A sentence with a colon introducing a clarification
- [ ] A named person introduced mid-clause naturally (no comma-appositive opener)
- [ ] A direct but non-hyperbolic word choice that is slightly surprising ("convincingly enough", "a perfectly ordinary thing")
- [ ] A mild concession or hedge ("which is not to say", "nobody called it at the time")

If any are missing: add one naturally. Do not force them.

---

## 13. Final Delivery Report

Deliver this to the user when the loop ends (score < 15% or 6 rounds hit):

```
## Delivery Report — [article name] — [date]

PHASE 2 AUDIT
Hard-fail audit:    ALL PASS
Structure & SEO:    ALL PASS
Formatting:         ALL PASS
Anti-AI voice:      ALL PASS
Sourcing:           ALL PASS

AI KILL LOOP
Rounds run:         __
Score trail:        R1: XX% → R2: XX% → FINAL: XX%
Rules gate:         ALL PASS every round
Sentences rewritten: __ total
Patterns targeted:  [e.g. sentence clusters, encyclopedia rhythm, tidy summaries]

FINAL STATE
Word count:         __ (target 680–730)
ZeroGPT score:      XX% [PASS / BEST EFFORT — could not reach <15% in 6 rounds]
Article file:       updated in place

NEXT STEP
Paste the 3 embed codes into the article, then submit to Sportskeeda.
Embed URLs are already in the file as <!-- EMBED N: ... --> comments.
```

---

## 14. Proven Pipeline (BATTLE-TESTED — Execute Exactly Like This)

This is the authoritative execution recipe. Validated on the Alexx Ekubo article (May 2026): **46.3% → 10.2% in 9 rounds, dual-gate clean**. Follow it for every new topic.

### 14.1 The Two-File Toolchain

```
articles/zerogpt_check.py    → Score Gate (Playwright + ad block + <mark> extraction)
articles/_audit_temp.py      → Rules Gate (word count, sentence lengths, em dash, contractions)
```

If `_audit_temp.py` does not exist when Step B starts, create it from the template in Section 14.4 below. Delete it at end of run.

### 14.2 The Exact Loop (Step B Execution)

For each round `R = 1..9`:

```powershell
# 1. SCORE GATE — get score + actual flagged sentences
.venv\Scripts\python.exe articles/zerogpt_check.py articles/<filename>.md
```

Output gives you `SCORE: XX%`, `FLAGGED_SENTENCES: N`, and a numbered list between `FLAGGED_LIST_START` / `FLAGGED_LIST_END`. **Exit 0 = pass. Exit 2 = continue.**

If pass, skip to Step C. Otherwise:

```
2. Pick ONLY flagged sentences from the list. NEVER touch clean sentences.
3. Apply Section 11 fix patterns (sentence length first, then 2.1–2.6 AI tells).
4. Apply Section 14.3 kill patterns below (the proven ones).
5. RULES GATE — run audit:
   .venv\Scripts\python.exe articles/_audit_temp.py
   Must show: UNDER 7: []   OVER 45: []   EM DASH: 0   CONTRACTIONS: []
6. Fix any new violations. Loop back to step 1.
```

After 6 rounds without pass, deliver best-score version with "BEST EFFORT" verdict (Section 13).

### 14.3 Empirically-Proven Kill Patterns (Use in Priority Order)

These are the patterns ZeroGPT actually flags, observed across real runs:

| Pattern (what ZeroGPT flags) | Fix |
|---|---|
| `*Title* in **YYYY** cast him as...` (encyclopedia year+title opener) | Lead with **actor action**: `He had *Title* on the **YYYY** calendar, playing X` |
| Parallel year list: `*A* in 2018, *B* in 2019, *C* in 2022` | Split across two sentences with different verbs ("kept his name on call sheets" + "by 2022 he was inside...") |
| Clean short factual sentence (`He was 38 when the cameras stopped.`) | Merge into adjacent sentence with embedded clause |
| 3+ consecutive sentences starting `He`/`His` | Vary openings: passive ("Inside X..."), gerund ("Working under Y..."), title-first ("*Title* sat on...") |
| Symmetric semicolon clauses (`X happened; Y happened`) | Make asymmetric: `X happened, and almost without notice at first, Y happened` |
| Tidy summary paragraph ending | Add a parenthetical aside or a Nigerian-press-voice digression |

### 14.4 `_audit_temp.py` Template (Rules Gate Script)

If the file is missing, create it before the loop:

```python
import re, sys
path = sys.argv[1] if len(sys.argv) > 1 else 'articles/<filename>.md'
t = open(path, encoding='utf-8').read()
body = re.sub(r'^#.*$', '', t, flags=re.M)
body = re.sub(r'<!--.*?-->', '', body, flags=re.S)
body = re.sub(r'https?://\S+', '', body)
body = re.sub(r'^-{3,}\s*$', '', body, flags=re.M)
plain = re.sub(r'[*_`]', '', body)
words = re.findall(r'\b[\w-]+\b', plain)
print('TOTAL WORDS:', len(words))
sents = [s.strip() for s in re.split(r'(?<=[.!?])\s+', plain) if s.strip()]
lens = [len(re.findall(r'\b[\w-]+\b', s)) for s in sents]
print('SENT COUNT:', len(sents))
print('MIN/MAX/AVG:', min(lens), max(lens), round(sum(lens)/len(lens), 1))
print('UNDER 7:', [(l, s[:70]) for l, s in zip(lens, sents) if l < 7])
print('OVER 45:', [(l, s[:70]) for l, s in zip(lens, sents) if l > 45])
print('EM DASH:', plain.count('--') + plain.count(chr(8212)))
print('CONTRACTIONS:', re.findall(r"\b\w+'\w+", plain))
```

### 14.5 Observed Pitfalls (Avoid These — From Real Runs)

- **"Cleaner = safer" is wrong**: Splitting a long sentence into clean shorter ones can RAISE the score (R2 39.3% → R3 42.4% on Alexx). Cleaner parallel reads more AI-like.
- **Score variance ±3%** between identical runs. Build margin: target ~12% in rewrites to land safely under 15%.
- **Word count drift +100–150 is acceptable** if it adds genuine human voice (725 → 830 worked on Alexx, both gates green).
- **Possessives like `actor's face` count as contractions** in some Rules Gate readings — prefer `the actor's face → the face` rewrites.
- **H2 questions are FROZEN** — they always appear in the flagged list but never touch them.

### 14.6 New Topic Onboarding Checklist

When user requests a new article:

1. **Phase 1** generates v1 via `_MASTER_WRITING_RULES.md` → `articles/<topic-slug>.md`
2. **Phase 2 Step A** — Section 3 audit (this file)
3. **Phase 2 Step B** — Run loop in 14.2 with the new filename
4. **Phase 2 Step C** — Deliver Section 13 report with score trail
5. User pastes embed HTML → ship to Sportskeeda

The pipeline is **filename-parameterized**. Nothing else changes per topic.

