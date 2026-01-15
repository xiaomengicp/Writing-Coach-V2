# Writing Coach - Customization Guide

This guide shows you how to customize the Writing Coach to match your evolving writing practice.

---

## Quick Start

**Three files you can edit**:

1. `methodologies/creative-nonfiction.md` - Your writing methodology
2. `config/writing-types.json` - Types of writing (scene, reflection, etc.)
3. `config/trigger-rules.json` - When and how to coach

**Changes take effect immediately** - no need to restart Obsidian.

---

## Editing Your Methodology

### Location
`.obsidian/plugins/writing-coach-plugin/methodologies/creative-nonfiction.md`

### What Goes In It

Your methodology should explain:
- Different types of writing you do (scene, reflection, memory work, etc.)
- What each type needs
- Common problems for each type
- How the coach should respond

### Structure

```markdown
# Your Methodology Name

## Writing Type 1: Scene
**What it needs**: ...
**Common problems**: ...
**Coaching strategies**: ...
**Signals**: High WPM, low adjective ratio

## Writing Type 2: Reflection
...

## General Principles
...
```

### Tips

1. **Be specific**: Instead of "needs more detail," write "needs sensory details - light, texture, sound"

2. **Include signals**: Tell the coach what metrics/patterns indicate this problem

3. **Give examples**: "Good coaching: 'What did that smell like?' Bad coaching: 'Add more description'"

4. **Keep it updated**: As you learn what coaching works, update the file

### Testing Your Changes

1. Edit the methodology file
2. Save it
3. Next time a trigger fires, coaching will use the new methodology
4. Check if the coaching message reflects your changes

---

## Customizing Writing Types

### Location
`.obsidian/plugins/writing-coach-plugin/config/writing-types.json`

### Adding a New Type

Let's say you want to add "Dialogue" as a writing type:

```json
{
  "id": "dialogue",
  "name": "💬 Dialogue", 
  "description": "Writing conversation between characters",
  "triggers": ["stuck", "rushing"],
  "targetMetrics": {
    "wpm": {
      "ideal": "25-40"
    }
  },
  "coachingGuidance": "Focus on rhythm of speech, subtext, what's not said"
}
```

**Fields**:
- `id`: Unique identifier (lowercase, no spaces)
- `name`: Display name (can include emoji)
- `description`: Shows in UI when you hover
- `triggers`: Which triggers apply to this type
- `targetMetrics`: Optional - ideal metric ranges
- `coachingGuidance`: Sent to Claude when coaching this type

### Modifying Existing Types

Want to change when "rushing" triggers for scenes?

Find the "scene" entry and change:

```json
"targetMetrics": {
  "wpm": {
    "ideal": "20-35",
    "warning": "> 50"    // Changed from 40 to 50
  }
}
```

### Available Triggers

You can assign any of these triggers to a type:
- `rushing` - Writing too fast
- `abstract_drift` - Getting too abstract
- `stuck` - Long pause
- `starting_confusion` - Hard to start new paragraph
- `getting_tired` - Energy declining

---

## Customizing Triggers

### Location
`.obsidian/plugins/writing-coach-plugin/config/trigger-rules.json`

### Adjusting Trigger Sensitivity

**Example**: "rushing" triggers too often

Find the `rushing` trigger and adjust conditions:

```json
"rushing": {
  "conditions": {
    "wpm": "> 50",              // Changed from 40
    "adjectiveRatio": "< 0.03",  // Changed from 0.05
    "duration": "> 180"          // Changed from 120 (now 3 min)
  }
}
```

**Condition syntax**:
- `"> 40"` - Greater than 40
- `"< 0.05"` - Less than 0.05
- `">= 30"` - Greater than or equal to 30
- `"increasing"` - Value is trending up
- `"decreasing"` - Value is trending down

### Changing Coaching Messages

Each trigger has a `systemPrompt` that guides Claude. You can edit it:

```json
"systemPrompt": "The user is writing quickly. Instead of telling them to slow down, ask a specific sensory question about something they just mentioned. Keep it under 40 words."
```

Tips for good prompts:
- Be specific about what to do
- Give examples
- Set word limits
- Describe the tone

### Adding a New Trigger

Let's add a "perfectionism" trigger:

```json
"perfectionism": {
  "name": "Perfectionism Loop",
  "description": "User repeatedly editing same text",
  "conditions": {
    "deletionRatio": "> 0.3",
    "pauseDuration": "> 120",
    "currentParagraphLength": "< 100"
  },
  "appliesTo": ["all"],
  "timing": {
    "delay": 0,
    "note": "Trigger immediately"
  },
  "priority": "high",
  "coachingStyle": "permission-giving",
  "enableChat": false,
  "systemPrompt": "User is caught in perfectionism - writing and deleting repeatedly. Give permission to write badly. Suggest a 'shitty first draft' approach. Be warm and normalizing. Under 50 words.",
  "examples": [
    "You're editing a lot. What if you just write it badly first?",
    "Perfectionism kicking in? Try: write it wrong, fix it later.",
    "This is just a first draft. It's allowed to be rough."
  ]
}
```

### Changing Rate Limiting

Don't want 5 minutes between triggers? Adjust:

```json
"globalSettings": {
  "minimumIntervalBetweenTriggers": 180,  // Changed to 3 minutes
}
```

---

## Common Customizations

### 1. "Triggers fire too often"

**Option A**: Increase minimum interval
```json
"minimumIntervalBetweenTriggers": 600  // 10 minutes
```

**Option B**: Make conditions stricter
```json
"wpm": "> 60"  // Instead of > 40
```

**Option C**: Increase timing delay
```json
"timing": {
  "delay": 120  // Wait 2 minutes instead of 30 seconds
}
```

### 2. "I want different coaching for academic writing"

**Step 1**: Create new methodology
```bash
cp methodologies/creative-nonfiction.md methodologies/academic.md
```

**Step 2**: Edit `academic.md` with your academic writing methodology

**Step 3**: In plugin settings, choose which methodology to use

### 3. "I want more supportive coaching"

Edit the `systemPrompt` in triggers to emphasize warmth:

```json
"systemPrompt": "User is stuck. Be very warm and supportive. Acknowledge the difficulty. Ask if they want to talk about it or take a break. Never be directive - only offer gentle options."
```

### 4. "I don't want 'getting_tired' trigger"

**Option A**: Remove it from all writing types:
```json
// In writing-types.json, remove "getting_tired" from triggers arrays
```

**Option B**: Make it nearly impossible to trigger:
```json
"getting_tired": {
  "conditions": {
    "sessionDuration": "> 300"  // 5 hours instead of 30 minutes
  }
}
```

### 5. "I want coaching to reference specific authors"

Add to your methodology:

```markdown
## Coaching Style

When coaching about scene writing, you may reference:
- Annie Dillard's attention to natural detail
- Joan Didion's precision
- James Baldwin's intensity

Use these references naturally, not as name-dropping.
```

---

## Advanced: Creating Methodology Profiles

You can create multiple methodology files for different projects:

```
methodologies/
├── creative-nonfiction.md    # Your memoir
├── academic.md               # Your dissertation  
├── fiction.md                # If you write fiction
└── journaling.md             # For daily practice
```

Then switch between them in settings.

---

## Testing Your Changes

### 1. Edit the file
Make your changes, save the file

### 2. Trigger a coaching event
- For "rushing": Type fast with few adjectives for 2+ minutes
- For "stuck": Stop typing for 3+ minutes
- For "starting_confusion": Put cursor at start of new paragraph, wait 1 min

### 3. Check the coaching message
Does it reflect your changes? If not, check:
- Is the file saved?
- Is the JSON valid? (Use a JSON validator)
- Is the writing type correct?

### 4. Iterate
Keep adjusting until coaching feels right

---

## Troubleshooting

### Changes not taking effect

1. **Check file location**: Must be in plugin directory
2. **Check JSON syntax**: Use a JSON validator (https://jsonlint.com)
3. **Restart plugin**: Settings → Community Plugins → Toggle off/on
4. **Check console**: Ctrl+Shift+I → Console tab for errors

### Coaching messages feel wrong

1. **Review systemPrompt**: Is it specific enough?
2. **Check examples**: Are they the tone you want?
3. **Verify conditions**: Are triggers firing at right times?
4. **Test methodology changes**: Edit methodology file

### Too many/few triggers

1. **Check conditions**: Are thresholds appropriate?
2. **Adjust timing delays**: More/less patient
3. **Modify rate limiting**: Change minimum interval

---

## Sharing Your Configuration

Want to share your methodology with others?

1. **Export**:
   ```bash
   cp methodologies/your-file.md ~/Desktop/
   cp config/writing-types.json ~/Desktop/
   cp config/trigger-rules.json ~/Desktop/
   ```

2. **Share**: Send files to others or publish

3. **Import**: Others can copy files into their plugin directory

---

## Examples from Real Usage

### Example 1: Tuned for dissertation writing

```json
// In writing-types.json
{
  "id": "argument",
  "name": "📊 Argument",
  "triggers": ["evidence_needed", "stuck"],
  "coachingGuidance": "Check for claim/evidence balance, suggest sources"
}
```

```json
// In trigger-rules.json - new trigger
"evidence_needed": {
  "conditions": {
    "abstractNounRatio": "> 0.4",
    "paragraphsSinceLastCoaching": "> 3"
  },
  "systemPrompt": "User is making claims. Gently ask: where's the evidence for this? Suggest types of evidence that would support it."
}
```

### Example 2: More supportive for trauma writing

```json
// In trigger-rules.json - modified stuck trigger
"stuck": {
  "systemPrompt": "User has paused. They might be at a difficult memory. Be especially gentle. Acknowledge this is hard work. Offer: continue, take a break, or write something else first. Never push.",
  "initialMessage": "Writing through this is hard. I'm here if you want to talk."
}
```

### Example 3: Faster pace for daily journaling

```json
// In trigger-rules.json
"rushing": {
  "conditions": {
    "wpm": "> 60",    // Higher threshold
    "duration": "> 300"  // Must be sustained longer
  }
}
```

---

## Getting Help

- **Implementation questions**: See `docs/IMPLEMENTATION.md`
- **Methodology writing**: See `docs/METHODOLOGY-GUIDE.md`
- **Bug reports**: Check console for errors
- **Feature ideas**: Document what you wish existed

---

## Philosophy

This tool is designed to grow with you. Your writing practice will evolve, and your methodology should too. Don't hesitate to:

- Try different configurations
- Break things (you can always revert)
- Experiment with new triggers
- Update your methodology weekly

The best configuration is the one that supports your actual writing process, not some ideal version of it.

**Trust your experience. Edit accordingly.**
