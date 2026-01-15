import { App, PluginSettingTab, Setting, Plugin } from 'obsidian';
import { PluginSettings, WritingType, TriggerRules, TriggerRule, APIUsage } from './types';

// Forward declaration for plugin type
interface WritingCoachPluginInterface extends Plugin {
    settings: PluginSettings;
    saveSettings(): Promise<void>;
    updateViewSettings(): void;
    setDebugMode(enabled: boolean): void;
    getWritingTypes(): WritingType[];
    getTriggerRules(): TriggerRules;
    getAPIUsage(): APIUsage;
    resetAPIUsage(): void;
}

export const DEFAULT_SETTINGS: PluginSettings = {
    apiKey: '',
    model: 'claude-sonnet-4-20250514',
    methodologyFile: 'methodologies/creative-nonfiction.md',
    showMetrics: true,
    showDebugInfo: false,
    currentWritingType: 'scene',
    enabledTriggers: ['rushing', 'stuck', 'abstract_drift', 'starting_confusion', 'getting_tired']
};

/**
 * SettingsTab - Settings UI for the Writing Coach plugin
 */
export class SettingsTab extends PluginSettingTab {
    plugin: WritingCoachPluginInterface;

    constructor(app: App, plugin: WritingCoachPluginInterface) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        containerEl.createEl('h2', { text: 'Writing Coach Settings' });

        // API Key section
        containerEl.createEl('h3', { text: 'Claude API' });

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your Claude API key from Anthropic. This is stored locally and never sent anywhere except to Anthropic.')
            .addText(text => text
                .setPlaceholder('sk-ant-...')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Model')
            .setDesc('Claude model to use for coaching')
            .addDropdown(dropdown => dropdown
                .addOption('claude-sonnet-4-20250514', 'Claude Sonnet 4')
                .addOption('claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet')
                .addOption('claude-3-haiku-20240307', 'Claude 3 Haiku (faster, cheaper)')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                })
            );

        // Display section
        containerEl.createEl('h3', { text: 'Display' });

        new Setting(containerEl)
            .setName('Show Metrics')
            .setDesc('Show real-time writing metrics in the coach panel')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showMetrics)
                .onChange(async (value) => {
                    this.plugin.settings.showMetrics = value;
                    await this.plugin.saveSettings();
                    this.plugin.updateViewSettings();
                })
            );

        new Setting(containerEl)
            .setName('Debug Mode')
            .setDesc('Show debug information in console (shorter rate limits, more logging)')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.showDebugInfo)
                .onChange(async (value) => {
                    this.plugin.settings.showDebugInfo = value;
                    await this.plugin.saveSettings();
                    this.plugin.setDebugMode(value);
                })
            );

        // Configuration section
        containerEl.createEl('h3', { text: 'Configuration' });

        new Setting(containerEl)
            .setName('Methodology File')
            .setDesc('Path to your methodology markdown file (relative to plugin folder)')
            .addText(text => text
                .setPlaceholder('methodologies/creative-nonfiction.md')
                .setValue(this.plugin.settings.methodologyFile)
                .onChange(async (value) => {
                    this.plugin.settings.methodologyFile = value;
                    await this.plugin.saveSettings();
                })
            );

        // Default writing type
        new Setting(containerEl)
            .setName('Default Writing Type')
            .setDesc('Writing type to use when opening a new file')
            .addDropdown(dropdown => {
                const types = this.plugin.getWritingTypes();
                for (const type of types) {
                    dropdown.addOption(type.id, type.name);
                }
                return dropdown
                    .setValue(this.plugin.settings.currentWritingType)
                    .onChange(async (value) => {
                        this.plugin.settings.currentWritingType = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Triggers section
        containerEl.createEl('h3', { text: 'Enabled Triggers' });
        containerEl.createEl('p', {
            text: 'Select which triggers are active. Triggers monitor your writing and provide coaching when conditions are met.',
            cls: 'setting-item-description'
        });

        const triggerRules = this.plugin.getTriggerRules();
        for (const [triggerName, rule] of Object.entries(triggerRules.triggers) as [string, TriggerRule][]) {
            new Setting(containerEl)
                .setName(rule.name)
                .setDesc(rule.description)
                .addToggle(toggle => toggle
                    .setValue(this.plugin.settings.enabledTriggers.includes(triggerName))
                    .onChange(async (value) => {
                        if (value) {
                            if (!this.plugin.settings.enabledTriggers.includes(triggerName)) {
                                this.plugin.settings.enabledTriggers.push(triggerName);
                            }
                        } else {
                            this.plugin.settings.enabledTriggers =
                                this.plugin.settings.enabledTriggers.filter((t: string) => t !== triggerName);
                        }
                        await this.plugin.saveSettings();
                    })
                );
        }

        // Usage section
        containerEl.createEl('h3', { text: 'API Usage' });

        const usage = this.plugin.getAPIUsage();
        const usageEl = containerEl.createDiv({ cls: 'api-usage-stats' });
        usageEl.createEl('p', { text: `API Calls: ${usage.calls}` });
        usageEl.createEl('p', { text: `Input Tokens: ${usage.inputTokens.toLocaleString()}` });
        usageEl.createEl('p', { text: `Output Tokens: ${usage.outputTokens.toLocaleString()}` });
        usageEl.createEl('p', { text: `Estimated Cost: $${usage.estimatedCost.toFixed(4)}` });

        const lastReset = new Date(usage.lastReset);
        usageEl.createEl('p', {
            text: `Since: ${lastReset.toLocaleDateString()} ${lastReset.toLocaleTimeString()}`,
            cls: 'usage-since'
        });

        new Setting(containerEl)
            .setName('Reset Usage')
            .setDesc('Reset the API usage counter')
            .addButton(button => button
                .setButtonText('Reset')
                .onClick(async () => {
                    this.plugin.resetAPIUsage();
                    this.display(); // Refresh the display
                })
            );

        // Help section
        containerEl.createEl('h3', { text: 'Help' });

        containerEl.createEl('p', {
            text: 'Configuration files can be edited directly:',
            cls: 'help-text'
        });

        const helpList = containerEl.createEl('ul', { cls: 'help-list' });
        helpList.createEl('li', { text: '📝 Methodology: methodologies/creative-nonfiction.md' });
        helpList.createEl('li', { text: '📊 Writing Types: config/writing-types.json' });
        helpList.createEl('li', { text: '⚡ Triggers: config/trigger-rules.json' });

        containerEl.createEl('p', {
            text: 'Changes to these files are automatically reloaded.',
            cls: 'help-text'
        });
    }
}
