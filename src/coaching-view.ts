import { ItemView, WorkspaceLeaf } from 'obsidian';
import { WritingMetrics, WritingType, CoachingMessage, ConversationMessage } from './types';

export const COACHING_VIEW_TYPE = 'writing-coach-view';

/**
 * CoachingView - The main UI panel for the Writing Coach
 * 
 * Features:
 * - Writing type selector
 * - Metrics display
 * - Coaching message display
 * - Chat interface for conversational mode
 * - Feedback buttons
 */
export class CoachingView extends ItemView {
    private rootEl: HTMLElement;
    private metricsEl: HTMLElement;
    private coachingEl: HTMLElement;
    private chatEl: HTMLElement;
    private typeSelectorEl: HTMLSelectElement;

    private writingTypes: WritingType[] = [];
    private currentType: string = 'scene';
    private showMetrics: boolean = true;
    private isInConversation: boolean = false;
    private conversationHistory: ConversationMessage[] = [];

    // Callbacks
    private onTypeChange: ((type: string) => void) | null = null;
    private onChatMessage: ((message: string) => void) | null = null;
    private onFeedback: ((helpful: boolean) => void) | null = null;
    private onDismiss: (() => void) | null = null;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return COACHING_VIEW_TYPE;
    }

    getDisplayText(): string {
        return 'Writing Coach';
    }

    getIcon(): string {
        return 'message-circle';
    }

    async onOpen(): Promise<void> {
        this.rootEl = this.contentEl;
        this.rootEl.empty();
        this.rootEl.addClass('writing-coach-container');

        // Build UI structure
        this.buildHeader();
        this.buildMetricsSection();
        this.buildCoachingSection();
        this.buildChatSection();
    }

    async onClose(): Promise<void> {
        // Cleanup
    }

    /**
     * Set callbacks
     */
    setCallbacks(callbacks: {
        onTypeChange?: (type: string) => void;
        onChatMessage?: (message: string) => void;
        onFeedback?: (helpful: boolean) => void;
        onDismiss?: () => void;
    }): void {
        this.onTypeChange = callbacks.onTypeChange || null;
        this.onChatMessage = callbacks.onChatMessage || null;
        this.onFeedback = callbacks.onFeedback || null;
        this.onDismiss = callbacks.onDismiss || null;
    }

    /**
     * Build header with type selector
     */
    private buildHeader(): void {
        const header = this.rootEl.createDiv({ cls: 'coach-header' });

        header.createEl('h4', { text: '✍️ Writing Coach' });

        // Type selector
        const selectorContainer = header.createDiv({ cls: 'type-selector-container' });
        selectorContainer.createSpan({ text: 'Writing type: ' });

        this.typeSelectorEl = selectorContainer.createEl('select', { cls: 'type-selector' });
        this.typeSelectorEl.addEventListener('change', () => {
            this.currentType = this.typeSelectorEl.value;
            this.onTypeChange?.(this.currentType);
        });

        this.updateTypeSelector();
    }

    /**
     * Build metrics section
     */
    private buildMetricsSection(): void {
        this.metricsEl = this.rootEl.createDiv({ cls: 'metrics-section' });
        this.metricsEl.createEl('h5', { text: '📊 Metrics' });
        this.metricsEl.createDiv({ cls: 'metrics-grid' });

        if (!this.showMetrics) {
            this.metricsEl.hide();
        }
    }

    /**
     * Build coaching message section
     */
    private buildCoachingSection(): void {
        this.coachingEl = this.rootEl.createDiv({ cls: 'coaching-section' });
        this.coachingEl.hide(); // Hidden until coaching message arrives
    }

    /**
     * Build chat section for conversational mode
     */
    private buildChatSection(): void {
        this.chatEl = this.rootEl.createDiv({ cls: 'chat-section' });
        this.chatEl.hide(); // Hidden until needed
    }

    /**
     * Update writing types in selector
     */
    setWritingTypes(types: WritingType[]): void {
        this.writingTypes = types;
        this.updateTypeSelector();
    }

    /**
     * Update the type selector dropdown
     */
    private updateTypeSelector(): void {
        if (!this.typeSelectorEl) return;

        this.typeSelectorEl.empty();

        for (const type of this.writingTypes) {
            const option = this.typeSelectorEl.createEl('option', {
                text: type.name,
                value: type.id
            });
            if (type.id === this.currentType) {
                option.selected = true;
            }
        }
    }

    /**
     * Set current writing type
     */
    setCurrentType(type: string): void {
        this.currentType = type;
        this.typeSelectorEl.value = type;
    }

    /**
     * Get current writing type
     */
    getCurrentType(): string {
        return this.currentType;
    }

    /**
     * Toggle metrics display
     */
    setShowMetrics(show: boolean): void {
        this.showMetrics = show;
        if (show) {
            this.metricsEl?.show();
        } else {
            this.metricsEl?.hide();
        }
    }

    /**
     * Update metrics display
     */
    updateMetrics(metrics: WritingMetrics): void {
        if (!this.metricsEl || !this.showMetrics) return;

        const grid = this.metricsEl.querySelector('.metrics-grid');
        if (!grid) return;

        grid.empty();

        const metricsToShow = [
            { label: 'WPM', value: metrics.wpm.toString(), trend: metrics.wpmTrend },
            { label: 'Session', value: `${Math.round(metrics.sessionDuration)}m` },
            { label: 'Words', value: metrics.totalWords.toString() },
            { label: 'Pause', value: `${Math.round(metrics.pauseDuration)}s` },
            { label: 'Adj %', value: `${(metrics.adjectiveRatio * 100).toFixed(1)}%` },
            { label: 'Abstract %', value: `${(metrics.abstractNounRatio * 100).toFixed(1)}%` }
        ];

        for (const metric of metricsToShow) {
            const item = grid.createDiv({ cls: 'metric-item' });
            item.createSpan({ cls: 'metric-label', text: metric.label });
            const valueEl = item.createSpan({ cls: 'metric-value', text: metric.value });
            if (metric.trend) {
                valueEl.addClass(`trend-${metric.trend}`);
            }
        }
    }

    /**
     * Show coaching message
     */
    showCoaching(message: CoachingMessage): void {
        if (!this.coachingEl) return;

        this.coachingEl.empty();
        this.coachingEl.show();

        // Message header
        const header = this.coachingEl.createDiv({ cls: 'coaching-header' });
        header.createSpan({ text: `💡 ${message.triggerName}`, cls: 'coaching-trigger' });

        // Close button
        const closeBtn = header.createEl('button', { text: '×', cls: 'coaching-close' });
        closeBtn.addEventListener('click', () => {
            this.hideCoaching();
            this.onDismiss?.();
        });

        // Message content
        const content = this.coachingEl.createDiv({ cls: 'coaching-content' });
        content.createEl('p', { text: message.message });

        // Feedback buttons
        const feedback = this.coachingEl.createDiv({ cls: 'coaching-feedback' });

        const helpfulBtn = feedback.createEl('button', { text: '👍 This helps', cls: 'feedback-btn helpful' });
        helpfulBtn.addEventListener('click', () => {
            this.onFeedback?.(true);
            this.hideCoaching();
        });

        const dismissBtn = feedback.createEl('button', { text: '👎 Not now', cls: 'feedback-btn dismiss' });
        dismissBtn.addEventListener('click', () => {
            this.onFeedback?.(false);
            this.hideCoaching();
        });

        // If this trigger enables chat, show chat input
        if (message.type === 'conversation-start') {
            this.showChatInterface();
        }
    }

    /**
     * Hide coaching message
     */
    hideCoaching(): void {
        this.coachingEl?.hide();
        this.hideChatInterface();
    }

    /**
     * Show chat interface for conversational mode
     */
    showChatInterface(): void {
        if (!this.chatEl) return;

        this.chatEl.empty();
        this.chatEl.show();
        this.isInConversation = true;

        // Chat history
        const historyEl = this.chatEl.createDiv({ cls: 'chat-history' });
        this.updateChatHistory(historyEl);

        // Chat input
        const inputContainer = this.chatEl.createDiv({ cls: 'chat-input-container' });
        const input = inputContainer.createEl('textarea', {
            cls: 'chat-input',
            attr: { placeholder: 'Type your response...' }
        });

        const sendBtn = inputContainer.createEl('button', { text: 'Send', cls: 'chat-send-btn' });
        sendBtn.addEventListener('click', () => {
            const message = input.value.trim();
            if (message) {
                this.onChatMessage?.(message);
                input.value = '';
            }
        });

        // Handle Enter key
        input.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const message = input.value.trim();
                if (message) {
                    this.onChatMessage?.(message);
                    input.value = '';
                }
            }
        });
    }

    /**
     * Update chat with new messages
     */
    updateChat(messages: ConversationMessage[]): void {
        this.conversationHistory = messages;

        const historyEl = this.chatEl?.querySelector('.chat-history');
        if (historyEl) {
            this.updateChatHistory(historyEl as HTMLElement);
        }
    }

    /**
     * Add a single message to chat
     */
    addChatMessage(message: ConversationMessage): void {
        this.conversationHistory.push(message);

        const historyEl = this.chatEl?.querySelector('.chat-history');
        if (historyEl) {
            this.updateChatHistory(historyEl as HTMLElement);
        }
    }

    /**
     * Update chat history display
     */
    private updateChatHistory(historyEl: HTMLElement): void {
        historyEl.empty();

        for (const msg of this.conversationHistory) {
            const msgEl = historyEl.createDiv({
                cls: `chat-message ${msg.role === 'user' ? 'user-message' : 'assistant-message'}`
            });
            msgEl.createEl('p', { text: msg.content });
        }

        // Scroll to bottom
        historyEl.scrollTop = historyEl.scrollHeight;
    }

    /**
     * Hide chat interface
     */
    hideChatInterface(): void {
        this.chatEl?.hide();
        this.isInConversation = false;
        this.conversationHistory = [];
    }

    /**
     * Check if in conversation mode
     */
    getIsInConversation(): boolean {
        return this.isInConversation;
    }

    /**
     * Show loading state
     */
    showLoading(): void {
        const loading = this.coachingEl?.querySelector('.loading');
        if (!loading && this.coachingEl) {
            this.coachingEl.show();
            this.coachingEl.createDiv({ cls: 'loading', text: 'Thinking...' });
        }
    }

    /**
     * Hide loading state
     */
    hideLoading(): void {
        const loading = this.coachingEl?.querySelector('.loading');
        if (loading) {
            loading.remove();
        }
    }

    /**
     * Show error message
     */
    showError(message: string): void {
        if (!this.coachingEl) return;

        this.coachingEl.empty();
        this.coachingEl.show();

        const errorEl = this.coachingEl.createDiv({ cls: 'coaching-error' });
        errorEl.createEl('p', { text: `⚠️ ${message}` });

        const closeBtn = errorEl.createEl('button', { text: 'Dismiss', cls: 'error-dismiss' });
        closeBtn.addEventListener('click', () => {
            this.hideCoaching();
        });
    }
}
