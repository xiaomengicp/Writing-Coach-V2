import { App, TFile } from 'obsidian';
import { WritingTypeConfig, TriggerRules, WritingType, TriggerRule } from './types';

/**
 * ConfigManager - Loads and watches configuration files
 * 
 * Handles:
 * - Loading methodology markdown file
 * - Loading JSON config files (writing-types, trigger-rules)
 * - Watching for file changes and auto-reloading
 */
export class ConfigManager {
    private app: App;
    private pluginDir: string;
    private methodology: string = '';
    private writingTypes: WritingTypeConfig;
    private triggerRules: TriggerRules;
    private onConfigChange: (() => void) | null = null;

    constructor(app: App, pluginDir: string) {
        this.app = app;
        this.pluginDir = pluginDir;
        this.writingTypes = this.getDefaultWritingTypes();
        this.triggerRules = this.getDefaultTriggerRules();
    }

    /**
     * Load all configuration files
     */
    async loadAll(): Promise<void> {
        await this.loadMethodology();
        await this.loadWritingTypes();
        await this.loadTriggerRules();
        this.setupWatchers();
    }

    /**
     * Set callback for when config changes
     */
    setOnConfigChange(callback: () => void): void {
        this.onConfigChange = callback;
    }

    /**
     * Load methodology markdown file
     */
    private async loadMethodology(): Promise<void> {
        const path = `${this.pluginDir}/methodologies/creative-nonfiction.md`;
        try {
            const exists = await this.app.vault.adapter.exists(path);
            if (exists) {
                this.methodology = await this.app.vault.adapter.read(path);
                console.log('[ConfigManager] Loaded methodology:', this.methodology.substring(0, 100) + '...');
            } else {
                console.warn('[ConfigManager] Methodology file not found:', path);
                this.methodology = '# Default Methodology\n\nNo methodology file found.';
            }
        } catch (error) {
            console.error('[ConfigManager] Failed to load methodology:', error);
            this.methodology = '# Methodology Error\n\nFailed to load methodology file.';
        }
    }

    /**
     * Load writing types configuration
     */
    private async loadWritingTypes(): Promise<void> {
        const path = `${this.pluginDir}/config/writing-types.json`;
        try {
            const exists = await this.app.vault.adapter.exists(path);
            if (exists) {
                const content = await this.app.vault.adapter.read(path);
                this.writingTypes = JSON.parse(content);
                console.log('[ConfigManager] Loaded writing types:', this.writingTypes.types.length);
            } else {
                console.warn('[ConfigManager] Writing types file not found, using defaults');
                this.writingTypes = this.getDefaultWritingTypes();
            }
        } catch (error) {
            console.error('[ConfigManager] Failed to load writing types:', error);
            this.writingTypes = this.getDefaultWritingTypes();
        }
    }

    /**
     * Load trigger rules configuration
     */
    private async loadTriggerRules(): Promise<void> {
        const path = `${this.pluginDir}/config/trigger-rules.json`;
        try {
            const exists = await this.app.vault.adapter.exists(path);
            if (exists) {
                const content = await this.app.vault.adapter.read(path);
                this.triggerRules = JSON.parse(content);
                console.log('[ConfigManager] Loaded trigger rules:', Object.keys(this.triggerRules.triggers).length);
            } else {
                console.warn('[ConfigManager] Trigger rules file not found, using defaults');
                this.triggerRules = this.getDefaultTriggerRules();
            }
        } catch (error) {
            console.error('[ConfigManager] Failed to load trigger rules:', error);
            this.triggerRules = this.getDefaultTriggerRules();
        }
    }

    /**
     * Setup file watchers for hot reload
     */
    private setupWatchers(): void {
        this.app.vault.on('modify', async (file: TFile) => {
            // Check if modified file is in our config directories
            if (file.path.includes('methodologies/')) {
                console.log('[ConfigManager] Methodology updated, reloading...');
                await this.loadMethodology();
                this.onConfigChange?.();
            }
            if (file.path.includes('config/')) {
                console.log('[ConfigManager] Config updated, reloading...');
                if (file.path.includes('writing-types')) {
                    await this.loadWritingTypes();
                }
                if (file.path.includes('trigger-rules')) {
                    await this.loadTriggerRules();
                }
                this.onConfigChange?.();
            }
        });
    }

    /**
     * Get loaded methodology
     */
    getMethodology(): string {
        return this.methodology;
    }

    /**
     * Get loaded writing types
     */
    getWritingTypes(): WritingTypeConfig {
        return this.writingTypes;
    }

    /**
     * Get a specific writing type by ID
     */
    getWritingType(id: string): WritingType | undefined {
        return this.writingTypes.types.find(t => t.id === id);
    }

    /**
     * Get loaded trigger rules
     */
    getTriggerRules(): TriggerRules {
        return this.triggerRules;
    }

    /**
     * Get a specific trigger rule by name
     */
    getTriggerRule(name: string): TriggerRule | undefined {
        return this.triggerRules.triggers[name];
    }

    /**
     * Default writing types if config file not found
     */
    private getDefaultWritingTypes(): WritingTypeConfig {
        return {
            types: [
                {
                    id: 'scene',
                    name: '🎬 Scene',
                    description: 'Scene writing: specific time/space/people/events',
                    triggers: ['rushing', 'abstract_drift'],
                    coachingGuidance: 'Encourage slowing down, sensory details'
                },
                {
                    id: 'reflection',
                    name: '💭 Reflection',
                    description: 'Reflection: transitioning from scene to thinking',
                    triggers: ['abstract_drift', 'stuck'],
                    allowAbstract: true,
                    coachingGuidance: 'Support questioning posture'
                },
                {
                    id: 'memory',
                    name: '📝 Memory Work',
                    description: 'Memory work: processing painful material',
                    triggers: ['stuck', 'getting_tired'],
                    needsMoreSupport: true,
                    coachingGuidance: 'Offer emotional support'
                }
            ]
        };
    }

    /**
     * Default trigger rules if config file not found
     */
    private getDefaultTriggerRules(): TriggerRules {
        return {
            triggers: {
                rushing: {
                    name: 'Writing Too Fast',
                    description: 'User is moving through material quickly',
                    conditions: {
                        wpm: '> 40',
                        adjectiveRatio: '< 0.05',
                        duration: '> 120'
                    },
                    appliesTo: ['scene', 'observation'],
                    timing: { delay: 30 },
                    priority: 'medium',
                    coachingStyle: 'gentle-brake',
                    enableChat: false,
                    systemPrompt: 'The user is writing quickly. Gently remind them to slow down.'
                },
                stuck: {
                    name: 'Stuck/Blocked',
                    description: 'User has paused for extended period',
                    conditions: {
                        pauseDuration: '> 180',
                        currentParagraphLength: '< 50'
                    },
                    appliesTo: ['all'],
                    timing: { delay: 0 },
                    priority: 'high',
                    coachingStyle: 'conversational',
                    enableChat: true,
                    systemPrompt: 'The user has been paused. Open with a gentle acknowledgment.',
                    initialMessage: 'Paused here for a bit. Want to talk about what\'s happening?'
                }
            },
            globalSettings: {
                minimumIntervalBetweenTriggers: 300,
                priorityOverride: { high: 180 },
                conversationRules: {
                    autoCloseOnWriting: true,
                    maxConversationLength: 10
                }
            }
        };
    }
}
