# Writing Coach Plugin - Complete Implementation Guide

**For**: Cursor AI / Development
**Version**: 2.0
**Architecture**: Three-layer system with live configuration

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Core Components](#core-components)
5. [Implementation Details](#implementation-details)
6. [API Integration](#api-integration)
7. [Configuration System](#configuration-system)
8. [Testing Strategy](#testing-strategy)
9. [Edge Cases](#edge-cases)

---

## System Overview

### What This Plugin Does

A psychoanalytically-informed writing coach for creative nonfiction that:
- Monitors writing behavior in real-time
- Detects specific writing states (rushing, stuck, drifting to abstract)
- Provides context-aware coaching based on user's methodology
- Enables multi-turn conversation when user is stuck
- Allows live editing of methodology and configuration

### Design Principles

1. **Non-intrusive**: Only intervene when truly needed
2. **Context-aware**: Different coaching for different writing types
3. **Methodology-driven**: All coaching based on user's writeable methodology
4. **Live configuration**: Users can edit rules without recompiling
5. **Transparent**: Show metrics so user understands what's happening

### Key Innovation

Unlike generic writing assistants, this coach:
- Understands the specific challenges of creative nonfiction (scene vs reflection, memory work, etc.)
- Uses psychoanalytic concepts (resistance, defense, transference)
- Adapts to user's evolving methodology
- Provides holding/containment, not just technical feedback

---

## Architecture

### Three-Layer System

```
┌────────────────────────────────────────────────────┐
│                   UI Layer                          │
│  - Writing type selector                            │
│  - Editor (Obsidian native)                        │
│  - Coach panel (metrics + messages + chat)         │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│                Sensor Layer (Local)                 │
│  - Real-time metrics calculation                    │
│  - Text analysis (WPM, word ratios, pauses)        │
│  - Pattern detection                                │
│  NO API calls - pure JavaScript                    │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│           Trigger Engine (Local Logic)              │
│  - Reads trigger-rules.json                         │
│  - Evaluates conditions against metrics             │
│  - Decides when to coach                            │
│  - Rate limiting                                    │
└────────────────────────────────────────────────────┘
                        ↓
┌────────────────────────────────────────────────────┐
│         Coaching Layer (Claude API)                 │
│  - Loads methodology from markdown file             │
│  - Constructs context-aware prompts                 │
│  - Generates coaching messages                      │
│  - Handles multi-turn conversations                 │
└────────────────────────────────────────────────────┘
```

### Data Flow

```
User types
    ↓
Sensor updates metrics every 5 seconds
    ↓
Trigger Engine checks conditions every 30 seconds
    ↓
If trigger activated → Build context → Call Claude API
    ↓
Display coaching in panel
    ↓
User can respond (if conversational mode)
    ↓
Continue conversation until user dismisses or starts writing
```

---

## File Structure

```
writing-coach-plugin/
├── main.ts                     # Plugin entry point
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
│
├── src/
│   ├── sensor.ts               # Metrics calculation
│   ├── trigger-engine.ts       # Condition evaluation
│   ├── claude-client.ts        # API wrapper
│   ├── config-manager.ts       # Config loading/watching
│   ├── coaching-view.ts        # UI component
│   └── types.ts                # TypeScript interfaces
│
├── methodologies/
│   ├── creative-nonfiction.md  # User's methodology (EDITABLE)
│   └── README.md               # How to write methodologies
│
├── config/
│   ├── writing-types.json      # Writing type definitions (EDITABLE)
│   ├── trigger-rules.json      # Trigger conditions (EDITABLE)
│   └── examples/               # Example configurations
│
└── docs/
    ├── IMPLEMENTATION.md       # This file
    ├── CUSTOMIZATION.md        # User guide for editing configs
    └── METHODOLOGY-GUIDE.md    # Guide for writing methodologies
```

---

## Core Components

### 1. Sensor (`src/sensor.ts`)

**Purpose**: Monitor writing behavior and calculate metrics

**Key Metrics**:

```typescript
interface WritingMetrics {
  // Basic
  wpm: number                    // Words per minute (rolling 1-min window)
  totalWords: number
  sessionDuration: number        // In minutes
  
  // Text analysis
  adjectiveRatio: number         // Adjectives / total words
  verbRatio: number              // Verbs / total words  
  abstractNounRatio: number      // Abstract nouns / total nouns
  averageSentenceLength: number
  
  // Behavior
  pauseDuration: number          // Current pause in seconds
  pauseLocation: 'start' | 'mid-sentence' | 'end-sentence' | 'end-paragraph'
  deletionRatio: number          // Deleted chars / written chars (last 5 min)
  
  // Patterns
  wpmTrend: 'increasing' | 'decreasing' | 'stable'
  recentWPM: number[]            // Last 10 readings
  
  // Context
  currentParagraphLength: number
  paragraphsSinceLastCoaching: number
}
```

**Implementation**:

```typescript
export class WritingSensor {
  private editor: Editor
  private metrics: WritingMetrics
  private updateInterval: number
  private lastText: string = ''
  private lastEditTime: number = Date.now()
  private editHistory: EditEvent[] = []
  
  constructor(editor: Editor) {
    this.editor = editor
    this.startMonitoring()
  }
  
  startMonitoring() {
    // Update metrics every 5 seconds
    this.updateInterval = window.setInterval(() => {
      this.updateMetrics()
    }, 5000)
  }
  
  private updateMetrics() {
    const currentText = this.editor.getValue()
    
    // Calculate WPM
    this.metrics.wpm = this.calculateWPM()
    
    // Analyze text
    this.metrics.adjectiveRatio = this.analyzeAdjectives(currentText)
    this.metrics.abstractNounRatio = this.analyzeAbstractNouns(currentText)
    
    // Track pauses
    const timeSinceEdit = Date.now() - this.lastEditTime
    this.metrics.pauseDuration = timeSinceEdit / 1000
    this.metrics.pauseLocation = this.detectPauseLocation()
    
    // Track deletions
    this.metrics.deletionRatio = this.calculateDeletionRatio()
    
    // Update trends
    this.updateTrends()
    
    this.lastText = currentText
  }
  
  private calculateWPM(): number {
    // Get edits in last 60 seconds
    const oneMinuteAgo = Date.now() - 60000
    const recentEdits = this.editHistory.filter(e => e.timestamp > oneMinuteAgo)
    
    const wordsAdded = recentEdits.reduce((sum, edit) => {
      return sum + this.countWords(edit.text)
    }, 0)
    
    return wordsAdded
  }
  
  private analyzeAdjectives(text: string): number {
    // Simple heuristic: words ending in -ful, -less, -ous, -ive, -al, -ic
    // + common adjectives list
    const words = text.toLowerCase().split(/\s+/)
    const adjectives = words.filter(w => this.isAdjective(w))
    return adjectives.length / words.length
  }
  
  private analyzeAbstractNouns(text: string): number {
    // Abstract nouns: emotion words, concept words
    // vs concrete nouns: things you can touch/see
    const abstractKeywords = [
      'love', 'hate', 'fear', 'anxiety', 'hope', 'despair',
      'identity', 'self', 'other', 'relationship', 'meaning',
      'truth', 'beauty', 'justice', 'freedom', 'power'
      // ... more
    ]
    
    const words = text.toLowerCase().split(/\s+/)
    const nouns = words.filter(w => this.isNoun(w))
    const abstractNouns = nouns.filter(w => 
      abstractKeywords.some(keyword => w.includes(keyword))
    )
    
    return abstractNouns.length / Math.max(nouns.length, 1)
  }
  
  private detectPauseLocation(): string {
    const cursor = this.editor.getCursor()
    const line = this.editor.getLine(cursor.line)
    const beforeCursor = line.substring(0, cursor.ch)
    
    if (beforeCursor.trim() === '') return 'start'
    if (beforeCursor.endsWith('.') || beforeCursor.endsWith('。')) return 'end-sentence'
    if (line.trim() === beforeCursor.trim()) return 'end-paragraph'
    return 'mid-sentence'
  }
  
  onEdit(change: EditorChange) {
    this.lastEditTime = Date.now()
    
    // Record edit event
    this.editHistory.push({
      timestamp: Date.now(),
      text: change.text.join(''),
      removed: change.removed?.join('') || '',
      from: change.from,
      to: change.to
    })
    
    // Keep only last 10 minutes of history
    const tenMinutesAgo = Date.now() - 600000
    this.editHistory = this.editHistory.filter(e => e.timestamp > tenMinutesAgo)
  }
  
  getMetrics(): WritingMetrics {
    return { ...this.metrics }
  }
}
```

### 2. Trigger Engine (`src/trigger-engine.ts`)

**Purpose**: Evaluate conditions and decide when to trigger coaching

```typescript
export class TriggerEngine {
  private rules: TriggerRules
  private lastTriggerTime: number = 0
  private triggerHistory: TriggerEvent[] = []
  
  constructor(rules: TriggerRules) {
    this.rules = rules
  }
  
  async checkTriggers(
    metrics: WritingMetrics,
    writingType: string,
    context: WritingContext
  ): Promise<TriggerResult | null> {
    
    // Rate limiting: minimum 5 minutes between triggers
    const timeSinceLastTrigger = Date.now() - this.lastTriggerTime
    if (timeSinceLastTrigger < 300000) {
      return null
    }
    
    // Check each trigger rule
    for (const [triggerName, rule] of Object.entries(this.rules.triggers)) {
      
      // Skip if this trigger doesn't apply to current writing type
      if (!this.appliesToType(rule, writingType)) {
        continue
      }
      
      // Evaluate conditions
      if (this.evaluateConditions(rule.conditions, metrics)) {
        
        // Record trigger
        this.lastTriggerTime = Date.now()
        this.triggerHistory.push({
          name: triggerName,
          timestamp: Date.now(),
          metrics: { ...metrics },
          writingType
        })
        
        return {
          triggerName,
          rule,
          metrics,
          context
        }
      }
    }
    
    return null
  }
  
  private evaluateConditions(
    conditions: TriggerConditions,
    metrics: WritingMetrics
  ): boolean {
    
    for (const [key, condition] of Object.entries(conditions)) {
      const value = metrics[key as keyof WritingMetrics]
      
      // Parse condition string (e.g., "> 40", "< 0.05", "increasing")
      if (!this.evaluateCondition(value, condition)) {
        return false
      }
    }
    
    return true
  }
  
  private evaluateCondition(value: any, condition: string): boolean {
    // Handle numeric comparisons
    if (condition.includes('>') || condition.includes('<') || condition.includes('=')) {
      const match = condition.match(/(>|<|>=|<=|=)\s*(\d+\.?\d*)/)
      if (match) {
        const operator = match[1]
        const threshold = parseFloat(match[2])
        
        switch (operator) {
          case '>': return value > threshold
          case '<': return value < threshold
          case '>=': return value >= threshold
          case '<=': return value <= threshold
          case '=': return value === threshold
        }
      }
    }
    
    // Handle string comparisons
    if (condition === 'increasing' || condition === 'decreasing' || condition === 'stable') {
      return value === condition
    }
    
    // Handle boolean
    if (condition === 'true') return value === true
    if (condition === 'false') return value === false
    
    return false
  }
  
  private appliesToType(rule: TriggerRule, writingType: string): boolean {
    if (rule.appliesTo.includes('all')) return true
    return rule.appliesTo.includes(writingType)
  }
}
```

### 3. Claude Client (`src/claude-client.ts`)

**Purpose**: Handle API communication with Claude

```typescript
export class ClaudeClient {
  private apiKey: string
  private model: string = 'claude-sonnet-4-20250514'
  private conversationHistory: Message[] = []
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async generateCoaching(
    triggerType: string,
    writingType: string,
    metrics: WritingMetrics,
    recentContent: string,
    methodology: string,
    triggerRule: TriggerRule
  ): Promise<string> {
    
    const systemPrompt = this.buildSystemPrompt(
      methodology,
      triggerRule,
      writingType
    )
    
    const userMessage = this.buildUserMessage(
      triggerType,
      metrics,
      recentContent
    )
    
    const response = await this.callAPI(systemPrompt, userMessage)
    
    return response
  }
  
  async continueConversation(
    userMessage: string,
    context: CoachingContext
  ): Promise<string> {
    
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage
    })
    
    const response = await this.callAPI(
      context.systemPrompt,
      this.conversationHistory
    )
    
    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response
    })
    
    return response
  }
  
  private buildSystemPrompt(
    methodology: string,
    triggerRule: TriggerRule,
    writingType: string
  ): string {
    return `You are a writing coach for creative nonfiction.

Your coaching is based on this methodology:

${methodology}

Current situation:
- User is writing: ${writingType}
- Trigger: ${triggerRule.name}
- Coaching style: ${triggerRule.coachingStyle}
- Your task: ${triggerRule.systemPrompt}

Guidelines:
- Keep messages SHORT (under 50 words)
- Be SPECIFIC (refer to concrete details from their writing)
- Be WARM but not saccharine
- Use QUESTIONS more than instructions
- Honor their process - you're here to support, not direct

Tone: Like a thoughtful friend who understands writing, not a teacher grading them.
`
  }
  
  private buildUserMessage(
    triggerType: string,
    metrics: WritingMetrics,
    recentContent: string
  ): string {
    return `The writer has been working for ${metrics.sessionDuration} minutes.

Current metrics:
- WPM: ${metrics.wpm}
- Adjective ratio: ${(metrics.adjectiveRatio * 100).toFixed(1)}%
- Abstract noun ratio: ${(metrics.abstractNounRatio * 100).toFixed(1)}%
- Current pause: ${metrics.pauseDuration} seconds

Recent writing:
"""
${recentContent}
"""

Generate a brief coaching message (under 50 words).`
  }
  
  private async callAPI(
    systemPrompt: string,
    messages: Message[] | string
  ): Promise<string> {
    
    const messageArray = typeof messages === 'string' 
      ? [{ role: 'user', content: messages }]
      : messages
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 300,
          system: systemPrompt,
          messages: messageArray
        })
      })
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }
      
      const data = await response.json()
      return data.content[0].text
      
    } catch (error) {
      console.error('Claude API error:', error)
      throw error
    }
  }
  
  resetConversation() {
    this.conversationHistory = []
  }
}
```

### 4. Config Manager (`src/config-manager.ts`)

**Purpose**: Load and watch configuration files

```typescript
export class ConfigManager {
  private app: App
  private pluginDir: string
  private methodology: string = ''
  private writingTypes: WritingTypeConfig
  private triggerRules: TriggerRules
  private watchers: Map<string, any> = new Map()
  
  constructor(app: App, pluginDir: string) {
    this.app = app
    this.pluginDir = pluginDir
  }
  
  async loadAll(): Promise<void> {
    await this.loadMethodology()
    await this.loadWritingTypes()
    await this.loadTriggerRules()
    this.setupWatchers()
  }
  
  private async loadMethodology(): Promise<void> {
    const path = `${this.pluginDir}/methodologies/creative-nonfiction.md`
    try {
      this.methodology = await this.app.vault.adapter.read(path)
    } catch (error) {
      console.error('Failed to load methodology:', error)
      this.methodology = '# Methodology not found'
    }
  }
  
  private async loadWritingTypes(): Promise<void> {
    const path = `${this.pluginDir}/config/writing-types.json`
    try {
      const content = await this.app.vault.adapter.read(path)
      this.writingTypes = JSON.parse(content)
    } catch (error) {
      console.error('Failed to load writing types:', error)
      this.writingTypes = this.getDefaultWritingTypes()
    }
  }
  
  private async loadTriggerRules(): Promise<void> {
    const path = `${this.pluginDir}/config/trigger-rules.json`
    try {
      const content = await this.app.vault.adapter.read(path)
      this.triggerRules = JSON.parse(content)
    } catch (error) {
      console.error('Failed to load trigger rules:', error)
      this.triggerRules = this.getDefaultTriggerRules()
    }
  }
  
  private setupWatchers(): void {
    // Watch methodology file
    this.app.vault.on('modify', async (file) => {
      if (file.path.includes('methodologies/')) {
        console.log('Methodology updated, reloading...')
        await this.loadMethodology()
      }
      if (file.path.includes('config/')) {
        console.log('Config updated, reloading...')
        await this.loadWritingTypes()
        await this.loadTriggerRules()
      }
    })
  }
  
  getMethodology(): string {
    return this.methodology
  }
  
  getWritingTypes(): WritingTypeConfig {
    return this.writingTypes
  }
  
  getTriggerRules(): TriggerRules {
    return this.triggerRules
  }
}
```

---

## API Integration

### Rate Limiting Strategy

```typescript
class RateLimiter {
  private lastCall: number = 0
  private minInterval: number = 300000 // 5 minutes
  
  canCall(): boolean {
    const now = Date.now()
    if (now - this.lastCall > this.minInterval) {
      this.lastCall = now
      return true
    }
    return false
  }
  
  getTimeUntilNext(): number {
    const elapsed = Date.now() - this.lastCall
    return Math.max(0, this.minInterval - elapsed)
  }
}
```

### Cost Tracking

```typescript
interface APIUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
}

class CostTracker {
  private usage: APIUsage = {
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCost: 0
  }
  
  recordCall(inputTokens: number, outputTokens: number) {
    this.usage.calls++
    this.usage.inputTokens += inputTokens
    this.usage.outputTokens += outputTokens
    
    // Pricing: $3/M input, $15/M output
    const cost = (inputTokens / 1000000 * 3) + (outputTokens / 1000000 * 15)
    this.usage.estimatedCost += cost
  }
  
  getUsage(): APIUsage {
    return { ...this.usage }
  }
  
  resetDaily() {
    // Called at midnight
    this.usage = {
      calls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0
    }
  }
}
```

---

## Configuration System

### Writing Types Configuration

See `config/writing-types.json` for the full structure.

Key points:
- Each type has an ID, name, description
- Specifies which triggers apply
- Can set type-specific metric targets
- User can edit this file directly

### Trigger Rules Configuration

See `config/trigger-rules.json` for the full structure.

Key points:
- Condition syntax: `"> 40"`, `"< 0.05"`, `"increasing"`
- Can specify multiple conditions (AND logic)
- `appliesTo`: array of writing type IDs or `["all"]`
- `enableChat`: boolean for conversational mode
- User can edit this file directly

### Methodology System

Methodology is a markdown file that gets inserted into Claude's system prompt.

Structure:
```markdown
# Methodology Name

## Writing Type 1
- What this type needs
- Common problems
- Coaching strategies

## Writing Type 2
...

## General Principles
...
```

---

## Testing Strategy

### Unit Tests

1. **Sensor Tests**:
   - WPM calculation accuracy
   - Adjective/verb ratio detection
   - Pause location detection
   - Deletion ratio tracking

2. **Trigger Engine Tests**:
   - Condition evaluation (>, <, =, trends)
   - Rate limiting
   - Type applicability

3. **Config Manager Tests**:
   - JSON parsing
   - File watching
   - Fallback to defaults

### Integration Tests

1. **Full Flow**:
   - Type in editor → Metrics update → Trigger fires → API called → Message displayed

2. **Conversation Flow**:
   - Stuck trigger → Chat opens → Multi-turn conversation → User starts writing → Chat closes

### Manual Testing Scenarios

1. **Rushing**: Type very fast with few adjectives → Should trigger after 2 min
2. **Stuck**: Stop typing for 3 min → Should offer conversation
3. **Config Edit**: Edit methodology file → Should reload without restart
4. **Type Switch**: Switch writing type → Should adjust triggers

---

## Edge Cases

### 1. API Key Missing/Invalid

```typescript
if (!apiKey) {
  new Notice('Please add your Claude API key in settings')
  return
}

try {
  await callAPI()
} catch (error) {
  if (error.status === 401) {
    new Notice('Invalid API key. Please check your settings.')
  } else {
    new Notice('API error. Please try again.')
  }
}
```

### 2. User Edits Config File While Plugin Running

Config manager watches for file changes and auto-reloads.

### 3. Rapid Trigger Firing

Rate limiter ensures minimum 5 minutes between triggers.

### 4. User In Middle of Conversation, Starts Writing

If user starts typing, chat should gracefully close:

```typescript
onEditorChange() {
  if (this.coachingView.isInConversation()) {
    this.coachingView.closeConversation('User started writing')
  }
}
```

### 5. Invalid JSON in Config Files

Try-catch with fallback to defaults:

```typescript
try {
  config = JSON.parse(content)
} catch {
  console.error('Invalid JSON, using defaults')
  config = getDefaults()
}
```

### 6. Very Long Methodology File

Truncate if needed to stay within API limits:

```typescript
if (methodology.length > 10000) {
  methodology = methodology.substring(0, 10000) + '...'
}
```

---

## Implementation Checklist

### Phase 1: Core Infrastructure

- [ ] Set up TypeScript project structure
- [ ] Implement Sensor class with basic metrics
- [ ] Implement Trigger Engine with condition evaluation
- [ ] Implement Config Manager with file watching
- [ ] Create basic UI with type selector

### Phase 2: API Integration

- [ ] Implement Claude Client
- [ ] Add rate limiting
- [ ] Add cost tracking
- [ ] Test single coaching message flow

### Phase 3: Conversational Mode

- [ ] Add chat UI to coaching panel
- [ ] Implement multi-turn conversation
- [ ] Add conversation history management
- [ ] Test stuck → conversation → resolution flow

### Phase 4: Configuration System

- [ ] Create default writing-types.json
- [ ] Create default trigger-rules.json
- [ ] Add methodology file
- [ ] Test live editing of configs

### Phase 5: Polish

- [ ] Add metrics display in UI
- [ ] Add settings page
- [ ] Add documentation
- [ ] Test all triggers
- [ ] User testing

---

## Performance Considerations

### Sensor Updates

- Update every 5 seconds (balance between responsiveness and CPU)
- Only analyze text that changed
- Keep rolling window of metrics, don't recalculate everything

### Trigger Checks

- Check every 30 seconds (less frequent than sensor updates)
- Early return if conditions clearly not met
- Cache expensive calculations

### API Calls

- Rate limited to prevent spam
- Include recent content only (last 500 words)
- Truncate methodology if too long

---

## Security Considerations

### API Key Storage

```typescript
// Store in Obsidian's data.json (encrypted by Obsidian)
settings: {
  apiKey: string  // Never log this or display in UI
}

// Always validate before use
if (!this.settings.apiKey || this.settings.apiKey.length < 20) {
  throw new Error('Invalid API key')
}
```

### User Data

- Never send full document to API, only recent 500 words
- No data stored on external servers
- All processing local except API calls

---

## Future Enhancements

### Version 2.1
- [ ] Multiple methodology support (switch between academic, fiction, etc.)
- [ ] Methodology templates
- [ ] Import/export configurations

### Version 2.2
- [ ] Trigger effectiveness tracking (which triggers lead to productive writing)
- [ ] Personalized trigger thresholds (learn from user's patterns)
- [ ] Session summaries

### Version 2.3
- [ ] Integration with spaced repetition for methodology learning
- [ ] Community methodology sharing
- [ ] Trigger marketplace

---

## Questions for Implementation

1. **POS Tagging**: Should we use a library like `compromise` for better adjective/verb detection, or keep it simple with regex patterns?

2. **Pause Detection**: Should we also track cursor movement to distinguish "thinking pause" from "went away from keyboard"?

3. **Metrics Display**: Minimal (just coaching) or detailed (show all metrics)?

4. **Conversation Memory**: Should conversations persist across sessions or reset each time?

5. **Default Methodology**: Should we include a general methodology for users who don't want to write their own?

---

## Getting Started

1. **Set up project**: 
   ```bash
   npm install
   npm run dev
   ```

2. **Test sensor**: Create minimal editor integration and verify metrics update

3. **Test trigger engine**: Mock metrics and verify condition evaluation

4. **Test API**: Create simple test that calls Claude with methodology

5. **Build UI**: Create coaching panel with type selector

6. **Integrate**: Connect all components

7. **User test**: Have Jo test with real writing

---

## Support & Documentation

- Implementation issues: Check this file first
- User customization questions: See CUSTOMIZATION.md
- Methodology writing: See METHODOLOGY-GUIDE.md

---

**Good luck building! This is a unique and powerful tool. Take care to honor the user's creative process.**
