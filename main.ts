import { Plugin, Editor, MarkdownView, Notice, WorkspaceLeaf } from 'obsidian';
import { ConfigManager } from './src/config-manager';
import { WritingSensor } from './src/sensor';
import { TriggerEngine } from './src/trigger-engine';
import { ClaudeClient } from './src/claude-client';
import { CoachingView, COACHING_VIEW_TYPE } from './src/coaching-view';
import { SettingsTab, DEFAULT_SETTINGS } from './src/settings';
import { PluginSettings, WritingType, TriggerRules, WritingContext, CoachingMessage, TriggerResult, APIUsage } from './src/types';

/**
 * Writing Coach Plugin
 * 
 * A psychoanalytically-informed writing coach for creative nonfiction.
 * Monitors writing behavior and provides context-aware coaching.
 */
export default class WritingCoachPlugin extends Plugin {
    settings: PluginSettings;

    private configManager: ConfigManager;
    private sensor: WritingSensor;
    private triggerEngine: TriggerEngine;
    private claudeClient: ClaudeClient;
    private coachingView: CoachingView | null = null;

    private currentWritingType: string = 'scene';
    private currentFile: string = '';
    private lastContent: string = '';

    async onload(): Promise<void> {
        console.log('[WritingCoach] Loading plugin...');

        // Load settings
        await this.loadSettings();

        // Get plugin directory path
        const pluginDir = this.manifest.dir || '';

        // Initialize components
        this.configManager = new ConfigManager(this.app, pluginDir);
        await this.configManager.loadAll();

        this.sensor = new WritingSensor();
        this.triggerEngine = new TriggerEngine(this.configManager.getTriggerRules());
        this.claudeClient = new ClaudeClient(this.settings.apiKey);

        // Set up config change listener
        this.configManager.setOnConfigChange(() => {
            this.triggerEngine.updateRules(this.configManager.getTriggerRules());
            this.updateViewWritingTypes();
        });

        // Set up sensor callback
        this.sensor.setOnMetricsUpdate((metrics) => {
            this.coachingView?.updateMetrics(metrics);
        });

        // Set up trigger callback
        this.triggerEngine.setOnTrigger((result) => {
            this.handleTrigger(result);
        });

        // Enable debug mode if set
        if (this.settings.showDebugInfo) {
            this.triggerEngine.setDevMode(true);
        }

        // Register the coaching view
        this.registerView(
            COACHING_VIEW_TYPE,
            (leaf) => {
                this.coachingView = new CoachingView(leaf);
                this.setupCoachingView();
                return this.coachingView;
            }
        );

        // Add ribbon icon to open coaching panel
        this.addRibbonIcon('message-circle', 'Open Writing Coach', () => {
            this.activateView();
        });

        // Add command to toggle coaching panel
        this.addCommand({
            id: 'toggle-writing-coach',
            name: 'Toggle Writing Coach Panel',
            callback: () => {
                this.activateView();
            }
        });

        // Add command to force trigger (for testing)
        this.addCommand({
            id: 'force-trigger-stuck',
            name: 'Force "Stuck" Trigger (Testing)',
            callback: () => {
                this.forceTrigger('stuck');
            }
        });

        this.addCommand({
            id: 'force-trigger-rushing',
            name: 'Force "Rushing" Trigger (Testing)',
            callback: () => {
                this.forceTrigger('rushing');
            }
        });

        // Register settings tab
        this.addSettingTab(new SettingsTab(this.app, this));

        // Listen to active leaf changes
        this.registerEvent(
            this.app.workspace.on('active-leaf-change', (leaf) => {
                this.onActiveLeafChange(leaf);
            })
        );

        // Listen to editor changes
        this.registerEvent(
            this.app.workspace.on('editor-change', (editor: Editor) => {
                this.onEditorChange(editor);
            })
        );

        // Start sensor and trigger engine
        this.sensor.startMonitoring();
        this.triggerEngine.startChecking(
            () => this.sensor.getMetrics(),
            () => this.currentWritingType,
            () => this.getWritingContext()
        );

        // Apply initial writing type from settings
        this.currentWritingType = this.settings.currentWritingType;

        console.log('[WritingCoach] Plugin loaded successfully');
    }

    async onunload(): Promise<void> {
        console.log('[WritingCoach] Unloading plugin...');

        this.sensor.stopMonitoring();
        this.triggerEngine.stopChecking();
    }

    /**
     * Set up coaching view callbacks
     */
    private setupCoachingView(): void {
        if (!this.coachingView) return;

        this.coachingView.setWritingTypes(this.configManager.getWritingTypes().types);
        this.coachingView.setCurrentType(this.currentWritingType);
        this.coachingView.setShowMetrics(this.settings.showMetrics);

        this.coachingView.setCallbacks({
            onTypeChange: (type) => {
                this.currentWritingType = type;
                this.settings.currentWritingType = type;
                this.saveSettings();
                console.log('[WritingCoach] Writing type changed to:', type);
            },
            onChatMessage: async (message) => {
                await this.handleChatMessage(message);
            },
            onFeedback: (helpful) => {
                console.log('[WritingCoach] Feedback:', helpful ? 'helpful' : 'not helpful');
                // Could log this for analytics
            },
            onDismiss: () => {
                this.claudeClient.resetConversation();
                console.log('[WritingCoach] Coaching dismissed');
            }
        });
    }

    /**
     * Update view with writing types from config
     */
    private updateViewWritingTypes(): void {
        this.coachingView?.setWritingTypes(this.configManager.getWritingTypes().types);
    }

    /**
     * Activate/show the coaching view
     */
    async activateView(): Promise<void> {
        const { workspace } = this.app;

        let leaf: WorkspaceLeaf | null = null;
        const leaves = workspace.getLeavesOfType(COACHING_VIEW_TYPE);

        if (leaves.length > 0) {
            leaf = leaves[0];
        } else {
            leaf = workspace.getRightLeaf(false);
            if (leaf) {
                await leaf.setViewState({
                    type: COACHING_VIEW_TYPE,
                    active: true
                });
            }
        }

        if (leaf) {
            workspace.revealLeaf(leaf);
        }
    }

    /**
     * Handle active leaf changes
     */
    private onActiveLeafChange(leaf: WorkspaceLeaf | null): void {
        if (!leaf) return;

        const view = leaf.view;
        if (view instanceof MarkdownView) {
            const file = view.file;
            if (file) {
                this.currentFile = file.path;
                this.lastContent = view.editor.getValue();

                // Update sensor with new content
                this.sensor.onEditorChange(view.editor);
            }
        }
    }

    /**
     * Handle editor changes
     */
    private onEditorChange(editor: Editor): void {
        const content = editor.getValue();

        // Update sensor
        this.sensor.onEditorChange(editor);

        // Check if user started writing during conversation
        if (this.coachingView?.getIsInConversation() && content !== this.lastContent) {
            const globalSettings = this.configManager.getTriggerRules().globalSettings;
            if (globalSettings.conversationRules?.autoCloseOnWriting) {
                console.log('[WritingCoach] User started writing, closing conversation');
                this.coachingView.hideChatInterface();
                this.claudeClient.resetConversation();
            }
        }

        this.lastContent = content;
    }

    /**
     * Get current writing context
     */
    private getWritingContext(): WritingContext {
        return {
            writingType: this.currentWritingType,
            recentContent: this.lastContent,
            currentFile: this.currentFile
        };
    }

    /**
     * Handle trigger firing
     */
    private async handleTrigger(result: TriggerResult): Promise<void> {
        console.log('[WritingCoach] Handling trigger:', result.triggerName);

        // Check if trigger is enabled
        if (!this.settings.enabledTriggers.includes(result.triggerName)) {
            console.log('[WritingCoach] Trigger disabled, skipping');
            return;
        }

        // Show loading
        await this.activateView();
        this.coachingView?.showLoading();

        try {
            // Generate coaching message
            const message = await this.claudeClient.generateCoaching(
                result.triggerName,
                this.currentWritingType,
                result.metrics,
                this.lastContent,
                this.configManager.getMethodology(),
                result.rule
            );

            // Create coaching message object
            const coachingMessage: CoachingMessage = {
                type: result.rule.enableChat ? 'conversation-start' : 'single',
                message: message,
                triggerName: result.rule.name,
                timestamp: Date.now(),
                context: result.context,
                metrics: result.metrics
            };

            // Show message
            this.coachingView?.hideLoading();
            this.coachingView?.showCoaching(coachingMessage);

            // Mark coaching event in sensor
            this.sensor.markCoachingEvent();

            // Show notice
            new Notice(`Writing Coach: ${result.rule.name}`);

        } catch (error) {
            console.error('[WritingCoach] Error generating coaching:', error);
            this.coachingView?.hideLoading();
            this.coachingView?.showError(error instanceof Error ? error.message : 'Failed to generate coaching');
        }
    }

    /**
     * Handle chat message from user
     */
    private async handleChatMessage(message: string): Promise<void> {
        if (!this.coachingView) return;

        // Add user message to view
        this.coachingView.addChatMessage({
            role: 'user',
            content: message,
            timestamp: Date.now()
        });

        try {
            // Get current trigger context
            const triggerRules = this.configManager.getTriggerRules();
            const stuckRule = triggerRules.triggers['stuck'];

            // Continue conversation
            const response = await this.claudeClient.continueConversation(message, {
                triggerName: 'stuck',
                writingType: this.currentWritingType,
                methodology: this.configManager.getMethodology(),
                systemPrompt: stuckRule?.systemPrompt || '',
                conversationHistory: this.claudeClient.getConversationHistory(),
                metrics: this.sensor.getMetrics(),
                recentContent: this.lastContent
            });

            // Add response to view
            this.coachingView.addChatMessage({
                role: 'assistant',
                content: response,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('[WritingCoach] Error in chat:', error);
            this.coachingView.showError(error instanceof Error ? error.message : 'Chat error');
        }
    }

    /**
     * Force a trigger (for testing)
     */
    private forceTrigger(triggerName: string): void {
        const result = this.triggerEngine.forceTrigger(
            triggerName,
            this.sensor.getMetrics(),
            this.getWritingContext()
        );

        if (result) {
            this.handleTrigger(result);
        }
    }

    /**
     * Update view settings
     */
    updateViewSettings(): void {
        this.coachingView?.setShowMetrics(this.settings.showMetrics);
    }

    /**
     * Set debug mode
     */
    setDebugMode(enabled: boolean): void {
        this.triggerEngine.setDevMode(enabled);
    }

    /**
     * Get writing types for settings
     */
    getWritingTypes(): WritingType[] {
        return this.configManager.getWritingTypes().types;
    }

    /**
     * Get trigger rules for settings
     */
    getTriggerRules(): TriggerRules {
        return this.configManager.getTriggerRules();
    }

    /**
     * Get API usage
     */
    getAPIUsage(): APIUsage {
        return this.claudeClient.getUsage();
    }

    /**
     * Reset API usage
     */
    resetAPIUsage(): void {
        this.claudeClient.resetUsage();
    }

    /**
     * Load settings
     */
    async loadSettings(): Promise<void> {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    /**
     * Save settings
     */
    async saveSettings(): Promise<void> {
        await this.saveData(this.settings);

        // Update Claude client with new API key
        this.claudeClient?.setApiKey(this.settings.apiKey);
    }
}
