// Core type definitions for Writing Coach plugin

export interface WritingMetrics {
  // Basic metrics
  wpm: number
  totalWords: number
  sessionDuration: number  // in minutes
  
  // Text analysis
  adjectiveRatio: number
  verbRatio: number
  abstractNounRatio: number
  averageSentenceLength: number
  
  // Behavior patterns
  pauseDuration: number  // in seconds
  pauseLocation: 'start' | 'mid-sentence' | 'end-sentence' | 'end-paragraph' | 'unknown'
  deletionRatio: number
  
  // Trends
  wpmTrend: 'increasing' | 'decreasing' | 'stable'
  recentWPM: number[]  // Last 10 readings
  
  // Context
  currentParagraphLength: number
  paragraphsSinceLastCoaching: number
}

export interface EditEvent {
  timestamp: number
  text: string
  removed: string
  from: { line: number; ch: number }
  to: { line: number; ch: number }
}

export interface TriggerConditions {
  [key: string]: string  // e.g., "wpm": "> 40", "pauseDuration": "> 180"
}

export interface TriggerRule {
  name: string
  description: string
  conditions: TriggerConditions
  appliesTo: string[]  // Writing type IDs or ["all"]
  timing: {
    delay: number  // seconds
    note?: string
  }
  priority: 'high' | 'medium' | 'low'
  coachingStyle: string
  enableChat: boolean
  systemPrompt: string
  initialMessage?: string  // For chat-enabled triggers
  conversationGuidance?: string
  examples?: string[]
}

export interface TriggerRules {
  triggers: {
    [key: string]: TriggerRule
  }
  globalSettings: {
    minimumIntervalBetweenTriggers: number
    minimumIntervalBetweenTriggersNote?: string
    priorityOverride?: {
      high: number
      highNote?: string
    }
    conversationRules?: {
      autoCloseOnWriting: boolean
      autoCloseOnWritingNote?: string
      maxConversationLength: number
      maxConversationLengthNote?: string
    }
  }
  notes?: {
    [key: string]: string
  }
}

export interface TriggerResult {
  triggerName: string
  rule: TriggerRule
  metrics: WritingMetrics
  context: WritingContext
}

export interface TriggerEvent {
  name: string
  timestamp: number
  metrics: WritingMetrics
  writingType: string
  userResponse?: 'helpful' | 'dismissed' | 'ignored'
}

export interface WritingType {
  id: string
  name: string
  description: string
  triggers: string[]
  targetMetrics?: {
    [key: string]: any
  }
  allowAbstract?: boolean
  needsMoreSupport?: boolean
  coachingGuidance?: string
}

export interface WritingTypeConfig {
  types: WritingType[]
  notes?: {
    [key: string]: string
  }
}

export interface WritingContext {
  writingType: string
  recentContent: string  // Last 500 words
  currentFile: string
  timeStuck?: number
}

export interface CoachingMessage {
  type: 'single' | 'conversation-start'
  message: string
  triggerName: string
  timestamp: number
  context: WritingContext
  metrics: WritingMetrics
}

export interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export interface CoachingContext {
  triggerName: string
  writingType: string
  methodology: string
  systemPrompt: string
  conversationHistory: ConversationMessage[]
  metrics: WritingMetrics
  recentContent: string
}

export interface APIUsage {
  calls: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  lastReset: number
}

export interface PluginSettings {
  apiKey: string
  model: string
  methodologyFile: string
  showMetrics: boolean
  showDebugInfo: boolean
  currentWritingType: string
  enabledTriggers: string[]
}

export interface CoachingState {
  isActive: boolean
  isInConversation: boolean
  currentMessage?: CoachingMessage
  conversationContext?: CoachingContext
  lastTriggerTime: number
  triggerHistory: TriggerEvent[]
}

// Helper type guards
export function isConversationalTrigger(rule: TriggerRule): boolean {
  return rule.enableChat === true
}

export function requiresImmediate(rule: TriggerRule): boolean {
  return rule.priority === 'high' && rule.timing.delay === 0
}

// Metric thresholds (can be overridden in config)
export const DEFAULT_THRESHOLDS = {
  HIGH_WPM: 40,
  LOW_ADJECTIVE_RATIO: 0.05,
  HIGH_ABSTRACT_RATIO: 0.3,
  LONG_PAUSE: 180,  // 3 minutes
  LONG_SESSION: 30,  // 30 minutes
  MIN_TRIGGER_INTERVAL: 300  // 5 minutes
}
