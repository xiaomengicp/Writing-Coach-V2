# Getting Started - For Cursor/Developer

## What You're Building

A three-layer writing coach system:
1. **Sensor** - Monitors writing, calculates metrics (local, no API)
2. **Trigger Engine** - Evaluates conditions, decides when to coach (local)
3. **Coaching** - Calls Claude API to generate messages (with methodology)

Key innovation: **Everything is live-editable** - methodology, types, triggers can be changed without recompiling.

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Start Here)

**Goal**: Get basic monitoring working

1. **Create Sensor** (`src/sensor.ts`)
   - Monitor editor changes
   - Calculate WPM (simple: count words added in last 60 seconds)
   - Track pause duration
   - Basic text analysis (adjective/verb counting)
   - Update metrics every 5 seconds

2. **Create Config Manager** (`src/config-manager.ts`)
   - Load methodology markdown file
   - Load writing-types.json
   - Load trigger-rules.json
   - Watch for file changes and reload

3. **Test**: Can you see metrics updating in console as you type?

### Phase 2: Trigger System

**Goal**: Detect when coaching is needed

1. **Create Trigger Engine** (`src/trigger-engine.ts`)
   - Load rules from config
   - Every 30 seconds, check if conditions are met
   - Evaluate condition strings (">", "<", "increasing", etc.)
   - Check if trigger applies to current writing type
   - Rate limiting (minimum 5 minutes between triggers)

2. **Test**: Can you trigger "rushing" by typing fast with few adjectives?

### Phase 3: UI Setup

**Goal**: User can see and interact with coach

1. **Create Coaching View** (`src/coaching-view.ts`)
   - Writing type selector at top
   - Metrics display (if enabled in settings)
   - Message display area
   - Chat interface (for conversational triggers)
   - "This helps" / "Not now" buttons

2. **Integrate with Main Plugin** (`main.ts`)
   - Register view
   - Listen to editor changes → update sensor
   - Pass metrics to trigger engine
   - When trigger fires → update view

3. **Test**: Can you see UI update when typing? Can you select writing type?

### Phase 4: Claude API Integration

**Goal**: Generate actual coaching messages

1. **Create Claude Client** (`src/claude-client.ts`)
   - API key from settings
   - Build system prompt from methodology + trigger info
   - Build user message from metrics + recent content
   - Call API, return message
   - Handle errors gracefully

2. **Integrate**: When trigger fires → call Claude → display message

3. **Test**: Does coaching message reflect your methodology?

### Phase 5: Conversational Mode

**Goal**: Multi-turn dialogue for "stuck" trigger

1. **Extend Claude Client**
   - Track conversation history
   - Add `continueConversation()` method
   - Reset when conversation ends

2. **Update Coaching View**
   - Show chat interface when trigger has `enableChat: true`
   - User can type responses
   - Display conversation history
   - Auto-close when user starts writing

3. **Test**: Get stuck → conversation opens → chat → start writing → closes

### Phase 6: Polish

1. **Settings page** - API key, methodology selection, toggle metrics
2. **Cost tracking** - Show API usage
3. **Feedback logging** - Track which triggers help
4. **Documentation** - In-app help

---

## File-by-File Implementation Order

### 1. `src/types.ts` ✅ (Already created)
All TypeScript interfaces.

### 2. `src/config-manager.ts`
```typescript
export class ConfigManager {
  async loadAll()
  getMethodology(): string
  getWritingTypes(): WritingTypeConfig
  getTriggerRules(): TriggerRules
  // Watch files for changes
}
```

**Test**: Can load JSON and markdown files, console.log them

### 3. `src/sensor.ts`
```typescript
export class WritingSensor {
  startMonitoring()
  onEdit(change: EditorChange)
  getMetrics(): WritingMetrics
  // Update metrics every 5 seconds
}
```

**Test**: Console.log metrics every 5 seconds while typing

### 4. `src/trigger-engine.ts`
```typescript
export class TriggerEngine {
  async checkTriggers(
    metrics: WritingMetrics,
    writingType: string,
    context: WritingContext
  ): Promise<TriggerResult | null>
  // Rate limiting
  // Condition evaluation
}
```

**Test**: Mock high WPM, verify "rushing" trigger returns

### 5. `src/coaching-view.ts`
```typescript
export class CoachingView extends ItemView {
  showMetrics(metrics: WritingMetrics)
  showWritingTypeSelector()
  showCoaching(message: CoachingMessage)
  showChat()  // For conversational mode
  // Handle user interactions
}
```

**Test**: Can manually call methods to update UI

### 6. `src/claude-client.ts`
```typescript
export class ClaudeClient {
  async generateCoaching(...): Promise<string>
  async continueConversation(...): Promise<string>
  // Build prompts
  // Call API
  // Handle errors
}
```

**Test**: Can call API with test data, get response

### 7. `main.ts`
```typescript
export default class WritingCoachPlugin extends Plugin {
  onload() {
    // Initialize all components
    // Wire them together
    // Set up event listeners
  }
}
```

**Test**: Full flow works

---

## Key Algorithms

### WPM Calculation
```typescript
calculateWPM(): number {
  const oneMinuteAgo = Date.now() - 60000
  const recentEdits = this.editHistory.filter(e => e.timestamp > oneMinuteAgo)
  const wordsAdded = recentEdits.reduce((sum, edit) => {
    return sum + this.countWords(edit.text)
  }, 0)
  return wordsAdded
}
```

### Condition Evaluation
```typescript
evaluateCondition(value: number, condition: string): boolean {
  // Parse "> 40", "< 0.05", etc.
  const match = condition.match(/(>|<|>=|<=)\s*(\d+\.?\d*)/)
  if (match) {
    const operator = match[1]
    const threshold = parseFloat(match[2])
    switch (operator) {
      case '>': return value > threshold
      case '<': return value < threshold
      // ...
    }
  }
  return false
}
```

### Adjective Detection (Simple)
```typescript
isAdjective(word: string): boolean {
  // Simple heuristic
  const endings = ['ful', 'less', 'ous', 'ive', 'al', 'ic', 'able']
  return endings.some(ending => word.endsWith(ending))
  // Or use 'compromise' library for better results
}
```

---

## Testing Strategy

### Unit Tests (Optional but Helpful)

Test each component in isolation:
- Sensor: Mock editor changes, verify metrics
- Trigger Engine: Mock metrics, verify trigger fires
- Config Manager: Mock file system, verify loading

### Manual Testing Scenarios

1. **Rush Trigger**
   - Select "Scene" type
   - Type very fast (>40 WPM)
   - Use few adjectives
   - After 2 minutes → should trigger

2. **Stuck Trigger**
   - Stop typing for 3 minutes
   - Should open conversation

3. **Config Edit**
   - Edit methodology file while plugin running
   - Next trigger should reflect changes

4. **Type Switch**
   - Switch from Scene to Reflection
   - Verify different triggers apply

---

## Common Pitfalls

### 1. Editor Not Available
Check `this.app.workspace.activeLeaf?.view.getViewType() === 'markdown'`

### 2. Config File Not Found
Always use try-catch when loading configs, fallback to defaults

### 3. API Rate Limits
Respect rate limiting, handle 429 errors

### 4. Metric Calculation Lag
Don't recalculate everything every update, keep rolling windows

### 5. Conversation Not Closing
Listen to editor change event, close chat when user types

---

## Debug Tips

### Console Logging

```typescript
// In sensor
console.log('Metrics:', this.getMetrics())

// In trigger engine
console.log('Checking triggers for type:', writingType)
console.log('Conditions met:', triggerName)

// In Claude client
console.log('API request:', systemPrompt.substring(0, 200))
console.log('API response:', response)
```

### Settings for Development

```typescript
const DEV_MODE = true

if (DEV_MODE) {
  // Reduce rate limiting
  minimumInterval = 60000  // 1 minute instead of 5
  
  // Always show metrics
  this.settings.showMetrics = true
  this.settings.showDebugInfo = true
  
  // Log everything
  console.log(...)
}
```

---

## API Integration Notes

### Cost Tracking

```typescript
// Track every call
recordAPICall(inputTokens: number, outputTokens: number) {
  this.usage.calls++
  this.usage.inputTokens += inputTokens
  this.usage.outputTokens += outputTokens
  this.usage.estimatedCost += 
    (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15)
}
```

### Error Handling

```typescript
try {
  const response = await this.callAPI(...)
} catch (error) {
  if (error.status === 401) {
    new Notice('Invalid API key')
  } else if (error.status === 429) {
    new Notice('Rate limited, try again in a moment')
  } else {
    console.error('API error:', error)
    new Notice('Coaching unavailable, check console')
  }
}
```

---

## Next Steps After Basic Implementation

1. **User Testing**: Have Jo use it, gather feedback
2. **Refine Triggers**: Adjust thresholds based on real usage
3. **Improve Text Analysis**: Consider using NLP library
4. **Add Features**: Session summaries, trigger analytics
5. **Polish UI**: Better design, animations, polish

---

## Questions? Issues?

Check:
1. IMPLEMENTATION.md - Full technical details
2. CUSTOMIZATION.md - How configs work
3. Console - Always check for errors
4. Types - TypeScript will guide you

**Start with Phase 1, get that working, then move forward incrementally.**

Good luck! You're building something unique and powerful. 🚀
