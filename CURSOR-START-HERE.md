# For Cursor: Implementation Instructions

## What This Is

A sophisticated writing coach plugin for Obsidian that monitors the user's creative nonfiction writing process and provides intelligent, context-aware coaching based on their personal methodology.

## Your Task

Implement the complete plugin following the architecture in `docs/IMPLEMENTATION.md`.

## Start Here

1. **Read First**:
   - `docs/IMPLEMENTATION.md` - Complete technical specification
   - `GETTING-STARTED.md` - Phase-by-phase implementation strategy
   - `src/types.ts` - All TypeScript interfaces

2. **Understand the Design**:
   - Three-layer architecture: Sensor → Trigger Engine → Coaching
   - Config files are live-editable (no restart needed)
   - Methodology drives all coaching behavior
   - Non-intrusive by design

3. **Implementation Order**:
   - Phase 1: Config Manager + Sensor (local monitoring)
   - Phase 2: Trigger Engine (condition evaluation)
   - Phase 3: UI (coaching view + type selector)
   - Phase 4: Claude API (coaching generation)
   - Phase 5: Conversational mode (multi-turn chat)
   - Phase 6: Polish (settings, cost tracking)

## Key Files Already Created

✅ `src/types.ts` - All interfaces
✅ `methodologies/creative-nonfiction.md` - User's methodology
✅ `config/writing-types.json` - Writing type definitions
✅ `config/trigger-rules.json` - Trigger conditions and rules
✅ `docs/IMPLEMENTATION.md` - Full technical spec
✅ `GETTING-STARTED.md` - Implementation guide

## What You Need to Build

### Core Components

1. **`src/config-manager.ts`**
   - Load markdown methodology file
   - Load JSON config files
   - Watch for file changes, auto-reload
   - Provide configs to other components

2. **`src/sensor.ts`**
   - Monitor editor in real-time
   - Calculate metrics (WPM, word ratios, pauses)
   - Update every 5 seconds
   - Provide metrics to trigger engine

3. **`src/trigger-engine.ts`**
   - Check trigger conditions every 30 seconds
   - Evaluate condition strings (">", "<", "increasing")
   - Rate limiting (5 min between triggers)
   - Return trigger result when conditions met

4. **`src/claude-client.ts`**
   - Build system prompt from methodology
   - Build user message from metrics + content
   - Call Claude API
   - Handle conversation history
   - Error handling

5. **`src/coaching-view.ts`**
   - Writing type selector
   - Metrics display
   - Coaching message display
   - Chat interface (for conversational mode)
   - User feedback buttons

6. **`main.ts`**
   - Plugin initialization
   - Wire all components together
   - Event handling (editor changes)
   - Settings management

## Critical Requirements

### 1. Live Configuration
- Watch files for changes: `this.app.vault.on('modify', ...)`
- Reload configs automatically
- No restart needed

### 2. Rate Limiting
- Minimum 5 minutes between triggers
- High-priority triggers can override after 3 minutes
- Track last trigger time

### 3. Context-Aware
- Different coaching for different writing types
- Include methodology in system prompt
- Recent 500 words as context
- Current metrics

### 4. Non-Intrusive
- Only intervene when conditions clearly met
- Auto-close when user starts writing
- Show metrics so user understands why

### 5. Conversational Mode
- Multi-turn dialogue for "stuck" trigger
- Conversation history management
- Auto-close when user starts writing

## Implementation Notes

### Text Analysis
Use simple heuristics first:
- Adjectives: word endings (-ful, -less, -ous, etc.)
- Verbs: common verb list + -ing, -ed endings
- Abstract nouns: emotion/concept word list

Can add `compromise` library later for better accuracy.

### WPM Calculation
```typescript
// Track edit events in last 60 seconds
// Count words added
// That's your WPM
```

### Condition Evaluation
```typescript
// Parse strings like "> 40", "< 0.05"
// Regex: /(>|<|>=|<=)\s*(\d+\.?\d*)/
// Compare value to threshold
```

### API Call Structure
```typescript
{
  model: "claude-sonnet-4-20250514",
  max_tokens: 300,
  system: methodology + trigger guidance,
  messages: [{ 
    role: "user", 
    content: metrics + recent content 
  }]
}
```

## Testing Approach

### While Building
- Console.log everything
- Test each component in isolation
- Mock data to trigger conditions

### Manual Testing
1. Rush trigger: Type fast (>40 WPM) with few adjectives for 2 min
2. Stuck trigger: Don't type for 3 minutes
3. Config edit: Edit methodology file, verify next coaching uses it
4. Type switch: Change type, verify different triggers apply

## Error Handling

Every async operation needs try-catch:
- File loading
- API calls
- JSON parsing

Fallback to defaults when things fail.

## Dev Mode Helpers

```typescript
const DEV_MODE = true

if (DEV_MODE) {
  // Shorter rate limit for testing
  minimumInterval = 60000  // 1 min
  
  // Always show debug info
  console.log(...)
}
```

## Important Details

1. **Only send recent 500 words to API** (not full document)
2. **User provides their own API key** (stored in settings)
3. **Track API usage** for cost transparency
4. **Auto-close chat when user starts writing**
5. **Show metrics if user enables it** (default: yes)

## Documentation References

- Technical details: `docs/IMPLEMENTATION.md`
- User customization: `docs/CUSTOMIZATION.md`
- Phase-by-phase: `GETTING-STARTED.md`
- Types: `src/types.ts`

## Success Criteria

✅ User can select writing type
✅ Metrics update in real-time
✅ Triggers fire when conditions met
✅ Coaching messages reflect methodology
✅ Conversational mode works for "stuck"
✅ Editing configs takes effect immediately
✅ No crashes, good error handling

## Build Commands

```bash
npm install
npm run build    # Production
npm run dev      # Development (watch mode)
```

---

**Read IMPLEMENTATION.md for complete details. Follow GETTING-STARTED.md for phase-by-phase approach. You've got this!**
