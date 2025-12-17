# 🔒 OPTIMIZATION LOCK - DO NOT MODIFY WITHOUT READING

**Last Updated:** 2025-12-17
**Status:** LOCKED for Performance

---

## ⚠️ CRITICAL PERFORMANCE RULES

This search engine has been hyper-optimized to match "Everything" app performance.
Any changes to the search logic MUST adhere to these rules.

### 1. INCREMENTAL SEARCH IS MANDATORY
The search engine uses a **cache-based incremental strategy**.
- When the user types "t" -> "tr", we **DO NOT** scan the full index.
- We scan ONLY the results from the previous query ("t").
- This reduces the search space from 1.5M -> 50k -> 500 items.
- **NEVER remove the `cache` or `lazy_cache` logic.**

### 2. NO ALLOCATIONS IN HOT LOOP
Inside the search loop (iterating 1.5M files):
- **NO** `String::new()`
- **NO** `to_lowercase()` (unless absolutely necessary in Lazy mode)
- **NO** `format!()`
- **NO** `Vec::push` (unless pre-allocated)
- **NO** `HashMap` lookups
- **NO** `HashSet` insertions

### 3. NO FUZZY MATCHING IN HOT LOOP
- **NEVER** use `jaro_winkler` or Levenshtein distance inside the main loop.
- It is O(N*M) and kills performance on 1.5M items.
- Use simple `contains` or `starts_with`.
- Fuzzy matching is only allowed on the *final* small result set (top 50), if at all.

### 4. LAZY MODE OPTIMIZATION
- The "5-second index" (`search_lazy`) must also use incremental caching.
- It iterates a `HashMap`, which is slow, so the cache is critical.

---

## 🧪 HOW TO TEST PERFORMANCE

1. **Boot Test:**
   - Start app.
   - Wait 5 seconds (Lazy mode active).
   - Type "windows".
   - Type " system32" (append).
   - Should be INSTANT.

2. **Verified Test:**
   - Wait 20 seconds (Verified index active).
   - Type "program files".
   - Should be INSTANT (<1ms).

---

## 🚫 BANNED PATTERNS

```rust
// ❌ BAD: Allocating string in loop
for file in files {
    if file.name.to_lowercase().contains(query) { ... } 
}

// ❌ BAD: Fuzzy match in loop
for file in files {
    if strsim::jaro_winkler(&file.name, query) > 0.8 { ... }
}

// ❌ BAD: Re-scanning everything
fn search(query) {
    // ignoring cache...
    for file in all_files { ... }
}
```

## ✅ APPROVED PATTERN

```rust
// ✅ GOOD: Incremental narrowing
let source = if query.starts_with(&cache.query) { &cache.results } else { &all_files };

for idx in source {
    // Simple integer math or direct byte comparison
    if index[idx].name_lower.contains(query) {
        matches.push(idx);
    }
}
```
