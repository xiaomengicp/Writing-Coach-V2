import { Editor } from 'obsidian';
import { WritingMetrics, EditEvent } from './types';
import { CHINESE_ADJECTIVES, CHINESE_ABSTRACT_NOUNS, CHINESE_VERBS } from './chinese-words';
import Segment from 'segmentit';

// Initialize Chinese segmentation
const segmentit = Segment();

// Word lists for text analysis
const ADJECTIVE_ENDINGS = ['ful', 'less', 'ous', 'ive', 'al', 'ic', 'able', 'ible', 'ish', 'ly', 'ary', 'ory'];
const COMMON_ADJECTIVES = new Set([
    'good', 'bad', 'big', 'small', 'large', 'little', 'old', 'young', 'new',
    'long', 'short', 'high', 'low', 'great', 'beautiful', 'dark', 'light',
    'hot', 'cold', 'warm', 'cool', 'fast', 'slow', 'hard', 'soft', 'loud',
    'quiet', 'happy', 'sad', 'angry', 'afraid', 'brave', 'calm', 'clear',
    'deep', 'dry', 'wet', 'empty', 'full', 'heavy', 'thick', 'thin', 'wide',
    'narrow', 'rough', 'smooth', 'sharp', 'sweet', 'sour', 'bitter', 'fresh',
    'strange', 'familiar', 'certain', 'possible', 'real', 'true', 'false'
]);

const ABSTRACT_NOUNS = new Set([
    'love', 'hate', 'fear', 'anxiety', 'hope', 'despair', 'joy', 'sorrow',
    'anger', 'peace', 'war', 'truth', 'lie', 'beauty', 'ugliness', 'justice',
    'injustice', 'freedom', 'slavery', 'power', 'weakness', 'strength',
    'knowledge', 'ignorance', 'wisdom', 'folly', 'courage', 'cowardice',
    'faith', 'doubt', 'belief', 'disbelief', 'trust', 'distrust', 'honor',
    'shame', 'pride', 'humility', 'guilt', 'innocence', 'grief', 'loss',
    'happiness', 'sadness', 'loneliness', 'friendship', 'enmity', 'loyalty',
    'betrayal', 'identity', 'self', 'soul', 'spirit', 'mind', 'heart',
    'memory', 'dream', 'reality', 'fantasy', 'imagination', 'thought',
    'feeling', 'emotion', 'sensation', 'perception', 'consciousness',
    'meaning', 'purpose', 'reason', 'logic', 'intuition', 'instinct',
    'desire', 'need', 'want', 'wish', 'ambition', 'aspiration', 'goal',
    'success', 'failure', 'achievement', 'disappointment', 'satisfaction',
    'frustration', 'contentment', 'discontent', 'pleasure', 'pain',
    'suffering', 'bliss', 'agony', 'ecstasy', 'melancholy', 'nostalgia',
    'regret', 'remorse', 'forgiveness', 'resentment', 'gratitude', 'envy',
    'jealousy', 'compassion', 'empathy', 'sympathy', 'apathy', 'indifference',
    'relationship', 'connection', 'bond', 'attachment', 'separation'
]);

const COMMON_VERBS = new Set([
    'be', 'is', 'am', 'are', 'was', 'were', 'been', 'being',
    'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing',
    'say', 'said', 'go', 'went', 'gone', 'get', 'got', 'make', 'made',
    'know', 'knew', 'think', 'thought', 'take', 'took', 'see', 'saw',
    'come', 'came', 'want', 'wanted', 'look', 'looked', 'use', 'used',
    'find', 'found', 'give', 'gave', 'tell', 'told', 'work', 'worked',
    'call', 'called', 'try', 'tried', 'ask', 'asked', 'need', 'needed',
    'feel', 'felt', 'become', 'became', 'leave', 'left', 'put', 'mean',
    'keep', 'kept', 'let', 'begin', 'began', 'seem', 'seemed', 'help',
    'show', 'showed', 'hear', 'heard', 'play', 'played', 'run', 'ran',
    'move', 'moved', 'live', 'lived', 'believe', 'believed', 'hold', 'held',
    'bring', 'brought', 'happen', 'happened', 'write', 'wrote', 'written',
    'sit', 'sat', 'stand', 'stood', 'lose', 'lost', 'pay', 'paid',
    'meet', 'met', 'include', 'included', 'continue', 'continued',
    'set', 'learn', 'learned', 'change', 'changed', 'lead', 'led',
    'understand', 'understood', 'watch', 'watched', 'follow', 'followed',
    'stop', 'stopped', 'create', 'created', 'speak', 'spoke', 'spoken',
    'read', 'allow', 'allowed', 'add', 'added', 'spend', 'spent',
    'grow', 'grew', 'grown', 'open', 'opened', 'walk', 'walked',
    'win', 'won', 'offer', 'offered', 'remember', 'remembered',
    'consider', 'considered', 'appear', 'appeared', 'buy', 'bought',
    'wait', 'waited', 'serve', 'served', 'die', 'died', 'send', 'sent',
    'expect', 'expected', 'build', 'built', 'stay', 'stayed', 'fall', 'fell'
]);

/**
 * WritingSensor - Monitors writing behavior and calculates metrics
 * 
 * Updates metrics every 5 seconds including:
 * - WPM (words per minute)
 * - Text analysis ratios
 * - Pause detection
 * - Deletion tracking
 */
export class WritingSensor {
    private metrics: WritingMetrics;
    private updateInterval: number | null = null;
    private lastText: string = '';
    private lastEditTime: number = Date.now();
    private sessionStartTime: number = Date.now();
    private editHistory: EditEvent[] = [];
    private recentWPMReadings: number[] = [];
    private onMetricsUpdate: ((metrics: WritingMetrics) => void) | null = null;
    private isFirstEdit: boolean = true;
    private isPaused: boolean = false;
    private currentFilePath: string = '';

    constructor() {
        this.metrics = this.getDefaultMetrics();
    }

    /**
     * Pause monitoring (stops trigger checks but keeps session)
     */
    pause(): void {
        this.isPaused = true;
        console.log('[Sensor] Paused');
    }

    /**
     * Resume monitoring
     */
    resume(): void {
        this.isPaused = false;
        this.lastEditTime = Date.now(); // Reset pause timer
        console.log('[Sensor] Resumed');
    }

    /**
     * Check if paused
     */
    getIsPaused(): boolean {
        return this.isPaused;
    }

    /**
     * Reset for new file (called when switching files)
     */
    resetForNewFile(filePath: string): void {
        if (filePath === this.currentFilePath) return;

        this.currentFilePath = filePath;
        this.isFirstEdit = true;
        this.editHistory = [];
        this.lastText = '';
        this.lastEditTime = Date.now();
        // Keep session duration running
        console.log('[Sensor] Reset for new file:', filePath);
    }

    /**
     * Set callback for metrics updates
     */
    setOnMetricsUpdate(callback: (metrics: WritingMetrics) => void): void {
        this.onMetricsUpdate = callback;
    }

    /**
     * Start monitoring - update metrics every 5 seconds
     */
    startMonitoring(): void {
        console.log('[Sensor] Starting monitoring');
        this.sessionStartTime = Date.now();

        // Update metrics every 5 seconds
        this.updateInterval = window.setInterval(() => {
            this.updateMetrics();
        }, 5000);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring(): void {
        if (this.updateInterval !== null) {
            window.clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        console.log('[Sensor] Stopped monitoring');
    }

    /**
     * Called when editor content changes
     */
    onEditorChange(editor: Editor): void {
        const currentText = editor.getValue();
        const now = Date.now();

        // Skip the first "change" which is just loading the file
        if (this.isFirstEdit) {
            this.lastText = currentText;
            this.isFirstEdit = false;
            console.log('[Sensor] Initial file load, skipping WPM count');
            return;
        }

        // Calculate what was added/removed
        const addedText = this.getAddedText(this.lastText, currentText);
        const removedText = this.getRemovedText(this.lastText, currentText);

        // Record edit event only if there's actual change from user typing
        if (addedText || removedText) {
            this.editHistory.push({
                timestamp: now,
                text: addedText,
                removed: removedText,
                from: { line: 0, ch: 0 },
                to: { line: 0, ch: 0 }
            });

            // Keep only last 10 minutes of history
            const tenMinutesAgo = now - 600000;
            this.editHistory = this.editHistory.filter(e => e.timestamp > tenMinutesAgo);

            this.lastEditTime = now;
        }

        this.lastText = currentText;

        // Update pause tracking
        this.updatePauseLocation(editor);
    }

    /**
     * Update all metrics
     */
    private updateMetrics(): void {
        const now = Date.now();

        // Session duration in minutes
        this.metrics.sessionDuration = (now - this.sessionStartTime) / 60000;

        // Calculate WPM
        this.metrics.wpm = this.calculateWPM();

        // Update WPM trend
        this.recentWPMReadings.push(this.metrics.wpm);
        if (this.recentWPMReadings.length > 10) {
            this.recentWPMReadings.shift();
        }
        this.metrics.recentWPM = [...this.recentWPMReadings];
        this.metrics.wpmTrend = this.calculateTrend(this.recentWPMReadings);

        // Analyze current text
        if (this.lastText) {
            this.analyzeText(this.lastText);
        }

        // Calculate pause duration
        this.metrics.pauseDuration = (now - this.lastEditTime) / 1000;

        // Calculate deletion ratio
        this.metrics.deletionRatio = this.calculateDeletionRatio();

        // Count total words
        this.metrics.totalWords = this.countWords(this.lastText);

        // Notify listeners
        this.onMetricsUpdate?.(this.getMetrics());

        // Debug logging
        console.log('[Sensor] Metrics updated:', {
            wpm: this.metrics.wpm,
            pause: Math.round(this.metrics.pauseDuration),
            adjRatio: (this.metrics.adjectiveRatio * 100).toFixed(1) + '%',
            trend: this.metrics.wpmTrend
        });
    }

    /**
     * Calculate words per minute (rolling 1-minute window)
     */
    private calculateWPM(): number {
        const oneMinuteAgo = Date.now() - 60000;
        const recentEdits = this.editHistory.filter(e => e.timestamp > oneMinuteAgo);

        const wordsAdded = recentEdits.reduce((sum, edit) => {
            return sum + this.countWords(edit.text);
        }, 0);

        return wordsAdded;
    }

    /**
     * Calculate deletion ratio (deleted chars / written chars in last 5 min)
     */
    private calculateDeletionRatio(): number {
        const fiveMinutesAgo = Date.now() - 300000;
        const recentEdits = this.editHistory.filter(e => e.timestamp > fiveMinutesAgo);

        let written = 0;
        let deleted = 0;

        for (const edit of recentEdits) {
            written += edit.text.length;
            deleted += edit.removed.length;
        }

        return written > 0 ? deleted / written : 0;
    }

    /**
     * Analyze text for adjectives, verbs, abstract nouns
     * Uses NLP segmentation for Chinese text
     */
    private analyzeText(text: string): void {
        // Get all words (English split by space, Chinese segmented by NLP)
        const words = this.segmentText(text);
        const totalWords = words.length;

        if (totalWords === 0) {
            this.metrics.adjectiveRatio = 0;
            this.metrics.verbRatio = 0;
            this.metrics.abstractNounRatio = 0;
            this.metrics.averageSentenceLength = 0;
            return;
        }

        // Count adjectives
        const adjectives = words.filter(w => this.isAdjective(w));
        this.metrics.adjectiveRatio = adjectives.length / totalWords;

        // Count verbs
        const verbs = words.filter(w => this.isVerb(w));
        this.metrics.verbRatio = verbs.length / totalWords;

        // Count abstract nouns (English + Chinese)
        const abstractNouns = words.filter(w => this.isAbstractNoun(w));
        this.metrics.abstractNounRatio = abstractNouns.length / totalWords;

        // Calculate average sentence length
        const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 0);
        if (sentences.length > 0) {
            const totalSentenceWords = sentences.reduce((sum, s) => {
                return sum + this.countWords(s);
            }, 0);
            this.metrics.averageSentenceLength = totalSentenceWords / sentences.length;
        } else {
            this.metrics.averageSentenceLength = 0;
        }

        // Current paragraph length
        const paragraphs = text.split(/\n\n+/);
        const lastParagraph = paragraphs[paragraphs.length - 1] || '';
        this.metrics.currentParagraphLength = this.countWords(lastParagraph);
    }

    /**
     * Segment text into words (handles both English and Chinese)
     */
    private segmentText(text: string): string[] {
        const words: string[] = [];

        // Check if text contains Chinese characters
        const hasChinese = /[\u4e00-\u9fff]/.test(text);

        if (hasChinese) {
            // Use segmentit for Chinese segmentation
            try {
                const segments = segmentit.doSegment(text);
                for (const seg of segments) {
                    const word = seg.w.trim().toLowerCase();
                    if (word.length > 0) {
                        words.push(word);
                    }
                }
            } catch (e) {
                // Fallback to simple split if segmentit fails
                console.warn('[Sensor] segmentit failed, using fallback:', e);
                const simpleWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
                words.push(...simpleWords);
            }
        } else {
            // English: split by whitespace
            const englishWords = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
            words.push(...englishWords);
        }

        return words;
    }

    /**
     * Check if word is an adjective (English or Chinese)
     */
    private isAdjective(word: string): boolean {
        // English adjectives
        if (COMMON_ADJECTIVES.has(word)) return true;
        if (ADJECTIVE_ENDINGS.some(ending => word.endsWith(ending))) return true;
        // Chinese adjectives
        if (CHINESE_ADJECTIVES.has(word)) return true;
        return false;
    }

    /**
     * Check if word is a verb (English or Chinese)
     */
    private isVerb(word: string): boolean {
        // English verbs
        if (COMMON_VERBS.has(word)) return true;
        if (word.endsWith('ing') || word.endsWith('ed')) return true;
        // Chinese verbs
        if (CHINESE_VERBS.has(word)) return true;
        return false;
    }

    /**
     * Check if word is an abstract noun (English or Chinese)
     */
    private isAbstractNoun(word: string): boolean {
        if (ABSTRACT_NOUNS.has(word)) return true;
        if (CHINESE_ABSTRACT_NOUNS.has(word)) return true;
        return false;
    }

    /**
     * Calculate trend from array of values
     */
    private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
        if (values.length < 3) return 'stable';

        const recent = values.slice(-5);
        const first = recent.slice(0, 2).reduce((a, b) => a + b, 0) / 2;
        const last = recent.slice(-2).reduce((a, b) => a + b, 0) / 2;

        const diff = last - first;
        if (diff > 5) return 'increasing';
        if (diff < -5) return 'decreasing';
        return 'stable';
    }

    /**
     * Update pause location based on cursor position
     */
    private updatePauseLocation(editor: Editor): void {
        const cursor = editor.getCursor();
        const line = editor.getLine(cursor.line);
        const beforeCursor = line.substring(0, cursor.ch);

        if (beforeCursor.trim() === '') {
            this.metrics.pauseLocation = 'start';
        } else if (beforeCursor.endsWith('.') || beforeCursor.endsWith('。') ||
            beforeCursor.endsWith('!') || beforeCursor.endsWith('?')) {
            this.metrics.pauseLocation = 'end-sentence';
        } else if (line.trim() === beforeCursor.trim() && cursor.ch === line.length) {
            // At end of line, check if it's end of paragraph
            const nextLine = editor.getLine(cursor.line + 1);
            if (!nextLine || nextLine.trim() === '') {
                this.metrics.pauseLocation = 'end-paragraph';
            } else {
                this.metrics.pauseLocation = 'end-sentence';
            }
        } else {
            this.metrics.pauseLocation = 'mid-sentence';
        }
    }

    /**
     * Get text that was added (with paste detection)
     */
    private getAddedText(oldText: string, newText: string): string {
        const lengthDiff = newText.length - oldText.length;

        // Large text addition (> 50 chars) = likely paste, skip
        if (lengthDiff > 50) {
            console.log('[Sensor] Large text addition detected (paste?), skipping WPM count:', lengthDiff, 'chars');
            return '';
        }

        // Normal typing
        if (lengthDiff > 0) {
            return newText.substring(newText.length - lengthDiff);
        }

        return '';
    }

    /**
     * Get text that was removed
     */
    private getRemovedText(oldText: string, newText: string): string {
        if (newText.length < oldText.length) {
            const diff = oldText.length - newText.length;
            return oldText.substring(oldText.length - diff);
        }
        return '';
    }

    /**
     * Count words in text (handles both English and Chinese)
     * For Chinese: each character counts as ~0.5 words (since Chinese is more dense)
     * For English: standard space-separated word count
     */
    private countWords(text: string): number {
        if (!text || text.trim().length === 0) return 0;

        // Separate Chinese characters and English words
        // Chinese characters: \u4e00-\u9fff
        const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];

        // Remove Chinese characters to count English words
        const englishOnly = text.replace(/[\u4e00-\u9fff]/g, ' ');
        const englishWords = englishOnly.trim().split(/\s+/).filter(w => w.length > 0);

        // Chinese: each character counts as 0.5 word (to normalize with English WPM)
        // English: each word counts as 1
        const chineseWordCount = chineseChars.length * 0.5;
        const englishWordCount = englishWords.length;

        return Math.round(chineseWordCount + englishWordCount);
    }

    /**
     * Get current metrics
     */
    getMetrics(): WritingMetrics {
        return { ...this.metrics };
    }

    /**
     * Reset sensor for new session
     */
    reset(): void {
        this.lastText = '';
        this.lastEditTime = Date.now();
        this.sessionStartTime = Date.now();
        this.editHistory = [];
        this.recentWPMReadings = [];
        this.isFirstEdit = true;
        this.metrics = this.getDefaultMetrics();
    }

    /**
     * Mark last coaching event
     */
    markCoachingEvent(): void {
        this.metrics.paragraphsSinceLastCoaching = 0;
    }

    /**
     * Default metrics
     */
    private getDefaultMetrics(): WritingMetrics {
        return {
            wpm: 0,
            totalWords: 0,
            sessionDuration: 0,
            adjectiveRatio: 0,
            verbRatio: 0,
            abstractNounRatio: 0,
            averageSentenceLength: 0,
            pauseDuration: 0,
            pauseLocation: 'unknown',
            deletionRatio: 0,
            wpmTrend: 'stable',
            recentWPM: [],
            currentParagraphLength: 0,
            paragraphsSinceLastCoaching: 0
        };
    }
}
