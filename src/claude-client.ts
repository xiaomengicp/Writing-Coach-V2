import { WritingMetrics, TriggerRule, ConversationMessage, CoachingContext, APIUsage } from './types';

/**
 * ClaudeClient - Handles API communication with Claude
 * 
 * Features:
 * - Build system prompts from methodology + trigger guidance
 * - Build user messages from metrics + recent content
 * - Support multi-turn conversations
 * - Cost tracking
 */
export class ClaudeClient {
    private apiKey: string;
    private model: string = 'claude-sonnet-4-20250514';
    private conversationHistory: ConversationMessage[] = [];
    private usage: APIUsage = {
        calls: 0,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCost: 0,
        lastReset: Date.now()
    };

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Update API key
     */
    setApiKey(apiKey: string): void {
        this.apiKey = apiKey;
    }

    /**
     * Check if API key is configured
     */
    hasApiKey(): boolean {
        return this.apiKey.length > 0;
    }

    /**
     * Generate coaching message for a trigger
     */
    async generateCoaching(
        triggerName: string,
        writingType: string,
        metrics: WritingMetrics,
        recentContent: string,
        methodology: string,
        triggerRule: TriggerRule
    ): Promise<string> {

        if (!this.hasApiKey()) {
            return 'Please add your Claude API key in settings to enable coaching.';
        }

        const systemPrompt = this.buildSystemPrompt(methodology, triggerRule, writingType);
        const userMessage = this.buildUserMessage(triggerName, metrics, recentContent);

        try {
            const response = await this.callAPI(systemPrompt, [{ role: 'user', content: userMessage, timestamp: Date.now() }]);

            // Start conversation for chat-enabled triggers
            if (triggerRule.enableChat) {
                this.conversationHistory = [
                    { role: 'user', content: userMessage, timestamp: Date.now() },
                    { role: 'assistant', content: response, timestamp: Date.now() }
                ];
            }

            return response;
        } catch (error) {
            console.error('[ClaudeClient] Error generating coaching:', error);
            throw error;
        }
    }

    /**
     * Continue an ongoing conversation
     */
    async continueConversation(
        userMessage: string,
        context: CoachingContext
    ): Promise<string> {

        if (!this.hasApiKey()) {
            return 'Please add your Claude API key in settings.';
        }

        // Add user message to history
        this.conversationHistory.push({
            role: 'user',
            content: userMessage,
            timestamp: Date.now()
        });

        try {
            const response = await this.callAPI(
                context.systemPrompt,
                this.conversationHistory
            );

            // Add assistant response to history
            this.conversationHistory.push({
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            });

            return response;
        } catch (error) {
            console.error('[ClaudeClient] Error continuing conversation:', error);
            throw error;
        }
    }

    /**
     * Build system prompt from methodology and trigger
     */
    private buildSystemPrompt(
        methodology: string,
        triggerRule: TriggerRule,
        writingType: string
    ): string {
        // Truncate methodology if too long (keep under 10k chars)
        let truncatedMethodology = methodology;
        if (methodology.length > 10000) {
            truncatedMethodology = methodology.substring(0, 10000) + '\n\n[Methodology truncated...]';
        }

        return `You are a writing coach for creative nonfiction.

Your coaching is based on this methodology:

${truncatedMethodology}

Current situation:
- User is writing: ${writingType}
- Trigger: ${triggerRule.name}
- Coaching style: ${triggerRule.coachingStyle}
- Your task: ${triggerRule.systemPrompt}

${triggerRule.conversationGuidance ? `\nConversation guidance: ${triggerRule.conversationGuidance}` : ''}

Guidelines:
- Keep messages SHORT (under 50 words)
- Be SPECIFIC (refer to concrete details from their writing)
- Be WARM but not saccharine
- Use QUESTIONS more than instructions
- Honor their process - you're here to support, not direct

Tone: Like a thoughtful friend who understands writing, not a teacher grading them.`;
    }

    /**
     * Build user message with metrics and content
     */
    private buildUserMessage(
        triggerName: string,
        metrics: WritingMetrics,
        recentContent: string
    ): string {
        // Only include last 500 words of content
        const words = recentContent.split(/\s+/);
        const last500Words = words.slice(-500).join(' ');

        return `The writer has been working for ${Math.round(metrics.sessionDuration)} minutes.

Current metrics:
- WPM: ${metrics.wpm}
- Adjective ratio: ${(metrics.adjectiveRatio * 100).toFixed(1)}%
- Abstract noun ratio: ${(metrics.abstractNounRatio * 100).toFixed(1)}%
- Current pause: ${Math.round(metrics.pauseDuration)} seconds
- Pause location: ${metrics.pauseLocation}
- WPM trend: ${metrics.wpmTrend}

Trigger: ${triggerName}

Recent writing:
"""
${last500Words || '[No content yet]'}
"""

Generate a brief coaching message (under 50 words).`;
    }

    /**
     * Call Claude API
     */
    private async callAPI(
        systemPrompt: string,
        messages: ConversationMessage[]
    ): Promise<string> {

        // Convert to API format
        const apiMessages = messages.map(m => ({
            role: m.role,
            content: m.content
        }));

        const requestBody = {
            model: this.model,
            max_tokens: 300,
            system: systemPrompt,
            messages: apiMessages
        };

        console.log('[ClaudeClient] Calling API...');

        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': this.apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[ClaudeClient] API error:', response.status, errorText);

            if (response.status === 401) {
                throw new Error('Invalid API key. Please check your settings.');
            } else if (response.status === 429) {
                throw new Error('Rate limited. Please try again in a moment.');
            } else {
                throw new Error(`API error: ${response.status}`);
            }
        }

        const data = await response.json();

        // Track usage
        if (data.usage) {
            this.usage.calls++;
            this.usage.inputTokens += data.usage.input_tokens || 0;
            this.usage.outputTokens += data.usage.output_tokens || 0;
            // Pricing: $3/M input, $15/M output (approximate)
            this.usage.estimatedCost +=
                ((data.usage.input_tokens || 0) / 1000000 * 3) +
                ((data.usage.output_tokens || 0) / 1000000 * 15);
        }

        console.log('[ClaudeClient] API response received');
        return data.content[0].text;
    }

    /**
     * Get conversation history
     */
    getConversationHistory(): ConversationMessage[] {
        return [...this.conversationHistory];
    }

    /**
     * Check if in active conversation
     */
    isInConversation(): boolean {
        return this.conversationHistory.length > 0;
    }

    /**
     * Reset conversation
     */
    resetConversation(): void {
        this.conversationHistory = [];
        console.log('[ClaudeClient] Conversation reset');
    }

    /**
     * Get API usage stats
     */
    getUsage(): APIUsage {
        return { ...this.usage };
    }

    /**
     * Reset usage (e.g., daily reset)
     */
    resetUsage(): void {
        this.usage = {
            calls: 0,
            inputTokens: 0,
            outputTokens: 0,
            estimatedCost: 0,
            lastReset: Date.now()
        };
    }
}
