# Writing Coach - Obsidian Plugin

An intelligent, psychoanalytically-informed writing coach for creative nonfiction.

Unlike generic AI assistants, this coach:
- **Understands your specific methodology** - You define how you write
- **Adapts to writing types** - Scene vs reflection vs memory work
- **Provides holding, not just feedback** - Recognizes when you're stuck vs when you're working through something
- **Evolves with you** - Edit methodology and triggers as you learn

---

## Features

### 🎯 Context-Aware Coaching

Different coaching for different writing:
- **Scene writing**: "What did that light look like?"
- **Reflection**: "Are you shifting to reflection, or still in the scene?"
- **Memory work**: "This is hard. Want to take a break or keep going?"
- **Stuck**: Opens conversation to help you work through it

### 📊 Real-Time Monitoring

Tracks your writing behavior:
- Words per minute
- Sensory language (adjectives)
- Abstract vs concrete
- Pause patterns
- Shows you what's happening as you write

### 🔄 Live Configuration

Edit anytime, changes take effect immediately:
- **Methodology** (markdown): Your writing philosophy and practices
- **Writing types** (JSON): Scene, reflection, memory, etc.
- **Triggers** (JSON): When and how to intervene

### 💬 Conversational Mode

When stuck, have an actual conversation:
- Multi-turn dialogue
- Helps you figure out what's blocking you
- Knows your methodology and recent writing
- Automatically closes when you start writing again

### 🎨 Non-Intrusive Design

- Only intervenes when truly needed
- Minimum 5 minutes between triggers
- Shows metrics so you understand what's happening
- Respects your flow

---

## Quick Start

### 1. Installation

Copy the `writing-coach-plugin` folder to:
```
your-vault/.obsidian/plugins/writing-coach-plugin/
```

### 2. Install Dependencies

```bash
cd .obsidian/plugins/writing-coach-plugin
npm install
npm run build
```

### 3. Get Claude API Key

1. Go to https://console.anthropic.com/
2. Sign up / log in
3. API Keys → Create Key
4. Copy the key

### 4. Configure Plugin

1. In Obsidian: Settings → Community Plugins → Enable "Writing Coach"
2. Click gear icon next to plugin
3. Paste your API key
4. Save

### 5. Start Writing

1. Open any markdown file
2. Click the 💬 icon in ribbon to open Coach panel
3. Select your writing type (Scene, Reflection, etc.)
4. Start writing!

---

## Cost

Very affordable:
- Single coaching message: ~$0.01
- 3-hour writing session with 10 interventions + 3 conversations: ~$0.25-0.50
- Monthly (daily writing): ~$7.5-15

You use your own API key, so you control costs. Can disable triggers anytime.

---

## How It Works

### Three Layers

1. **Sensor Layer** (local, no API)
   - Monitors your writing in real-time
   - Calculates metrics every 5 seconds
   - Detects patterns

2. **Trigger Engine** (local, no API)
   - Checks conditions every 30 seconds
   - Evaluates against your rules
   - Decides when to intervene

3. **Coaching Layer** (Claude API)
   - Loads your methodology
   - Generates context-aware messages
   - Handles conversations

### Example Flow

```
You're writing a scene...
  ↓
Sensor: WPM = 45, adjectives = 3%, 2 minutes sustained
  ↓
Trigger Engine: Conditions met for "rushing"
  ↓
Coach: Calls Claude API with:
  - Your methodology
  - Recent 500 words
  - Current metrics
  - Trigger type
  ↓
Claude generates: "You mentioned the kitchen. What did it smell like?"
  ↓
Displayed in coach panel
```

---

## Customization

### Your Methodology

Edit: `methodologies/creative-nonfiction.md`

This file defines:
- What different types of writing need
- Common problems for each type
- How the coach should respond
- Your writing philosophy

**Changes take effect immediately.**

Example:
```markdown
## Scene Writing

**What it needs**: Sensory details, specific time/space

**Common problems**: Writing too fast, avoiding painful memories

**Coaching strategies**: 
- Ask about specific sensory details
- Remind to slow down
- Give permission to take time

**Signals**: High WPM (>40), low adjective ratio (<5%)
```

### Writing Types

Edit: `config/writing-types.json`

Define the types of writing you do:
```json
{
  "id": "scene",
  "name": "🎬 Scene",
  "triggers": ["rushing", "abstract_drift"],
  "coachingGuidance": "Encourage sensory details..."
}
```

Add your own types, adjust triggers, set target metrics.

### Trigger Rules

Edit: `config/trigger-rules.json`

Control when and how coaching happens:
```json
{
  "rushing": {
    "conditions": {
      "wpm": "> 40",
      "adjectiveRatio": "< 0.05"
    },
    "timing": { "delay": 30 },
    "systemPrompt": "User writing quickly..."
  }
}
```

Adjust sensitivity, timing, coaching style.

**Full customization guide**: [docs/CUSTOMIZATION.md](docs/CUSTOMIZATION.md)

---

## Documentation

- **[IMPLEMENTATION.md](docs/IMPLEMENTATION.md)** - Complete technical guide for developers
- **[CUSTOMIZATION.md](docs/CUSTOMIZATION.md)** - How to customize methodology and triggers
- **[METHODOLOGY-GUIDE.md](docs/METHODOLOGY-GUIDE.md)** - How to write effective methodologies

---

## Philosophy

This tool is based on several principles:

### 1. Methodology Over Templates

Rather than generic writing advice, coaching is grounded in YOUR specific methodology. You define what good writing looks like for your practice.

### 2. Process Over Product

The coach monitors your writing process (rhythm, patterns, behaviors), not just the text. It understands the difference between productive struggle and being stuck.

### 3. Holding Over Directing

Inspired by psychoanalytic concepts of "holding" and "containment." The coach provides support and presence, not instructions. It asks questions rather than gives answers.

### 4. Adaptation Over Prescription

Your writing practice evolves. Your methodology should too. Everything is editable, nothing is fixed.

### 5. Transparency Over Magic

Shows you the metrics it's tracking, so you understand why it intervenes. No black box.

---

## FAQ

**Q: Does this work for fiction? Academic writing? Poetry?**
A: It's designed for creative nonfiction, but you can adapt it. Edit the methodology and writing types to match your practice.

**Q: Can I turn off specific triggers?**
A: Yes. Either remove them from writing-types.json, or make conditions nearly impossible to meet.

**Q: What if I don't want to write my own methodology?**
A: The included creative nonfiction methodology (based on real practices) is comprehensive. You can use it as-is or modify it gradually.

**Q: How much does this cost to run?**
A: Very little. Typical writing session: $0.25-0.50. You can track usage at console.anthropic.com.

**Q: Does my writing get sent anywhere?**
A: Only recent 500 words go to Claude API when coaching triggers. Nothing stored on servers. Everything local except API calls.

**Q: Can I use this with Teams/Projects?**
A: Yes, but each user needs their own API key. You can share methodology/config files.

**Q: What if coaching is annoying?**
A: Adjust trigger sensitivity in config files. Or increase minimum interval between triggers. Full control is yours.

---

## Advanced Features

### Multiple Methodologies

Create different methodology files for different projects:
```
methodologies/
├── memoir.md
├── dissertation.md
├── fiction.md
└── journaling.md
```

Switch in settings.

### Trigger Analytics

See which triggers fire most, which you find helpful:
```
Settings → Writing Coach → View Statistics
```

### Custom Triggers

Add your own triggers for patterns you notice:
```json
"my_custom_trigger": {
  "conditions": { ... },
  "systemPrompt": "..."
}
```

### Community Methodologies

Share your methodology with others or use community-created ones.

---

## Roadmap

### v2.1
- [ ] Trigger effectiveness tracking
- [ ] Session summaries
- [ ] Multiple methodology switching in UI
- [ ] Export conversation history

### v2.2
- [ ] Learning from your feedback (adaptive thresholds)
- [ ] More sophisticated text analysis
- [ ] Integration with daily notes

### v2.3
- [ ] Methodology templates
- [ ] Community methodology library
- [ ] Collaborative features

---

## Contributing

This is primarily a personal tool, but if you:
- Create a methodology for a different genre
- Add useful triggers
- Improve the core system

Feel free to share!

---

## Credits

Built for serious writers who are reflective about their process.

Inspired by:
- Psychoanalytic concepts of holding, containment, and working through
- Creative nonfiction practices of Annie Dillard, Joan Didion, James Baldwin
- The observation that writers don't need more advice - they need someone who understands their specific struggle

---

## License

MIT

---

## Support

- Technical issues: Check console (Ctrl+Shift+I)
- Configuration help: See CUSTOMIZATION.md
- Methodology questions: See METHODOLOGY-GUIDE.md

---

**Start writing. The coach will be there when you need it.**
