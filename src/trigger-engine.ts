import { WritingMetrics, TriggerRules, TriggerRule, TriggerResult, TriggerEvent, WritingContext, TriggerConditions } from './types';

/**
 * TriggerEngine - Evaluates conditions and decides when to trigger coaching
 * 
 * Features:
 * - Check conditions every 30 seconds
 * - Parse condition strings ("> 40", "< 0.05", "increasing")
 * - Rate limiting (5 min between triggers, 3 min for high priority)
 * - Track trigger history
 */
export class TriggerEngine {
    private rules: TriggerRules;
    private lastTriggerTime: number = 0;
    private triggerHistory: TriggerEvent[] = [];
    private checkInterval: number | null = null;
    private onTrigger: ((result: TriggerResult) => void) | null = null;
    private isPaused: boolean = false;

    // Dev mode settings
    private devMode: boolean = false;

    constructor(rules: TriggerRules) {
        this.rules = rules;
    }

    /**
     * Pause trigger checking
     */
    pause(): void {
        this.isPaused = true;
        console.log('[TriggerEngine] Paused');
    }

    /**
     * Resume trigger checking
     */
    resume(): void {
        this.isPaused = false;
        console.log('[TriggerEngine] Resumed');
    }

    /**
     * Check if paused
     */
    getIsPaused(): boolean {
        return this.isPaused;
    }

    /**
     * Update trigger rules (for hot reload)
     */
    updateRules(rules: TriggerRules): void {
        this.rules = rules;
        console.log('[TriggerEngine] Rules updated');
    }

    /**
     * Set callback for when trigger fires
     */
    setOnTrigger(callback: (result: TriggerResult) => void): void {
        this.onTrigger = callback;
    }

    /**
     * Enable dev mode (shorter rate limits)
     */
    setDevMode(enabled: boolean): void {
        this.devMode = enabled;
        console.log('[TriggerEngine] Dev mode:', enabled);
    }

    /**
     * Start checking triggers periodically
     */
    startChecking(
        getMetrics: () => WritingMetrics,
        getWritingType: () => string,
        getContext: () => WritingContext
    ): void {
        console.log('[TriggerEngine] Starting trigger checks every 30 seconds');

        this.checkInterval = window.setInterval(() => {
            const metrics = getMetrics();
            const writingType = getWritingType();
            const context = getContext();

            this.checkTriggers(metrics, writingType, context);
        }, 30000);
    }

    /**
     * Stop checking triggers
     */
    stopChecking(): void {
        if (this.checkInterval !== null) {
            window.clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        console.log('[TriggerEngine] Stopped checking');
    }

    /**
     * Check all triggers against current metrics
     */
    checkTriggers(
        metrics: WritingMetrics,
        writingType: string,
        context: WritingContext
    ): TriggerResult | null {

        // Skip checking if paused
        if (this.isPaused) {
            return null;
        }

        const now = Date.now();

        // Get minimum interval based on settings
        const minInterval = this.devMode ? 60000 : (this.rules.globalSettings.minimumIntervalBetweenTriggers * 1000);
        const highPriorityInterval = this.devMode ? 30000 : ((this.rules.globalSettings.priorityOverride?.high || 180) * 1000);

        // Check each trigger rule
        for (const [triggerName, rule] of Object.entries(this.rules.triggers)) {

            // Skip if this trigger doesn't apply to current writing type
            if (!this.appliesToType(rule, writingType)) {
                continue;
            }

            // Evaluate conditions
            if (this.evaluateConditions(rule.conditions, metrics)) {

                // Check rate limiting
                const timeSinceLastTrigger = now - this.lastTriggerTime;
                const requiredInterval = rule.priority === 'high' ? highPriorityInterval : minInterval;

                if (timeSinceLastTrigger < requiredInterval) {
                    console.log(`[TriggerEngine] ${triggerName} conditions met but rate limited. Wait: ${Math.round((requiredInterval - timeSinceLastTrigger) / 1000)}s`);
                    continue;
                }

                // Apply timing delay if specified
                if (rule.timing.delay > 0) {
                    // For simplicity, we'll check if conditions have been met for the delay duration
                    // This is a simplified implementation
                    console.log(`[TriggerEngine] ${triggerName} has delay: ${rule.timing.delay}s`);
                }

                console.log(`[TriggerEngine] Trigger fired: ${triggerName}`);

                // Record trigger
                this.lastTriggerTime = now;
                const event: TriggerEvent = {
                    name: triggerName,
                    timestamp: now,
                    metrics: { ...metrics },
                    writingType
                };
                this.triggerHistory.push(event);

                // Keep only last 100 triggers
                if (this.triggerHistory.length > 100) {
                    this.triggerHistory = this.triggerHistory.slice(-100);
                }

                const result: TriggerResult = {
                    triggerName,
                    rule,
                    metrics,
                    context
                };

                // Notify listener
                this.onTrigger?.(result);

                return result;
            }
        }

        return null;
    }

    /**
     * Force trigger a specific trigger (for testing)
     */
    forceTrigger(
        triggerName: string,
        metrics: WritingMetrics,
        context: WritingContext
    ): TriggerResult | null {
        const rule = this.rules.triggers[triggerName];
        if (!rule) {
            console.warn(`[TriggerEngine] Unknown trigger: ${triggerName}`);
            return null;
        }

        console.log(`[TriggerEngine] Force triggering: ${triggerName}`);

        const result: TriggerResult = {
            triggerName,
            rule,
            metrics,
            context
        };

        this.onTrigger?.(result);
        return result;
    }

    /**
     * Evaluate all conditions for a trigger
     */
    private evaluateConditions(
        conditions: TriggerConditions,
        metrics: WritingMetrics
    ): boolean {

        for (const [key, condition] of Object.entries(conditions)) {
            // Map condition key to metrics key
            let metricKey = key;
            if (key === 'duration') metricKey = 'sessionDuration';

            const value = metrics[metricKey as keyof WritingMetrics];

            if (!this.evaluateCondition(value, condition)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Evaluate a single condition
     */
    private evaluateCondition(value: any, condition: string): boolean {
        // Handle numeric comparisons
        const numericMatch = condition.match(/([><]=?|=)\s*(-?\d+\.?\d*)/);
        if (numericMatch) {
            const operator = numericMatch[1];
            const threshold = parseFloat(numericMatch[2]);
            const numValue = typeof value === 'number' ? value : parseFloat(value);

            if (isNaN(numValue)) return false;

            switch (operator) {
                case '>': return numValue > threshold;
                case '<': return numValue < threshold;
                case '>=': return numValue >= threshold;
                case '<=': return numValue <= threshold;
                case '=': return numValue === threshold;
            }
        }

        // Handle trend comparisons
        if (condition === 'increasing' || condition === 'decreasing' || condition === 'stable') {
            return value === condition;
        }

        // Handle pause location
        if (condition === 'start' || condition === 'mid-sentence' ||
            condition === 'end-sentence' || condition === 'end-paragraph') {
            return value === condition;
        }

        // Handle boolean
        if (condition === 'true') return value === true;
        if (condition === 'false') return value === false;

        console.warn(`[TriggerEngine] Unknown condition format: ${condition}`);
        return false;
    }

    /**
     * Check if trigger applies to writing type
     */
    private appliesToType(rule: TriggerRule, writingType: string): boolean {
        if (rule.appliesTo.includes('all')) return true;
        return rule.appliesTo.includes(writingType);
    }

    /**
     * Get trigger history
     */
    getTriggerHistory(): TriggerEvent[] {
        return [...this.triggerHistory];
    }

    /**
     * Get time until next trigger allowed
     */
    getTimeUntilNextTrigger(): number {
        const minInterval = this.devMode ? 60000 : (this.rules.globalSettings.minimumIntervalBetweenTriggers * 1000);
        const elapsed = Date.now() - this.lastTriggerTime;
        return Math.max(0, minInterval - elapsed);
    }

    /**
     * Reset trigger engine
     */
    reset(): void {
        this.lastTriggerTime = 0;
        this.triggerHistory = [];
    }
}
