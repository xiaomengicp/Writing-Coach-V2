# Writing Coach v2.0 - Project Overview

**Created**: January 15, 2026
**For**: Jo's creative nonfiction writing practice
**Architecture**: Three-layer system with live configuration

---

## What's Included

This is a **complete specification package** for building the Writing Coach plugin. It includes:

✅ Full technical documentation
✅ Configuration files (editable by user)
✅ Jo's creative nonfiction methodology
✅ TypeScript type definitions
✅ Implementation guides for developers
✅ User customization documentation

**No code is implemented yet** - this is the blueprint for Cursor to build from.

---

## File Structure

```
writing-coach-v2/
├── CURSOR-START-HERE.md          ⭐ START HERE for implementation
├── GETTING-STARTED.md             📖 Phase-by-phase build guide
├── README.md                      📄 User-facing documentation
│
├── docs/
│   ├── IMPLEMENTATION.md          🔧 Complete technical specification
│   └── CUSTOMIZATION.md           ✏️ How users customize the system
│
├── methodologies/
│   └── creative-nonfiction.md     📝 Jo's writing methodology (editable)
│
├── config/
│   ├── writing-types.json         🎯 Writing type definitions (editable)
│   └── trigger-rules.json         ⚙️ Trigger conditions (editable)
│
├── src/
│   └── types.ts                   💻 TypeScript interfaces
│
└── [Standard plugin files]
    ├── manifest.json
    ├── package.json
    ├── tsconfig.json
    ├── esbuild.config.mjs
    ├── versions.json
    └── .gitignore
```

---

## Quick Navigation

### For Developers (Cursor)
1. **START**: `CURSOR-START-HERE.md`
2. **Architecture**: `docs/IMPLEMENTATION.md`
3. **Build Guide**: `GETTING-STARTED.md`
4. **Types**: `src/types.ts`

### For Users (Jo)
1. **Overview**: `README.md`
2. **Customization**: `docs/CUSTOMIZATION.md`
3. **Methodology**: `methodologies/creative-nonfiction.md`
4. **Config**: `config/` folder

---

## What This Plugin Does

A psychoanalytically-informed writing coach that:

### 1. Monitors Writing Behavior
- Words per minute
- Sensory language (adjectives)
- Abstract vs concrete language
- Pause patterns
- Deletion behavior

### 2. Detects Writing States
- **Rushing**: Moving too fast through scenes
- **Abstract drift**: Losing concrete details
- **Stuck**: Long pause, possibly blocked
- **Starting confusion**: Hard to begin paragraph
- **Getting tired**: Energy declining

### 3. Provides Context-Aware Coaching
Different coaching for different types:
- **Scene writing**: "What did that smell like?"
- **Reflection**: "Are you shifting to reflection?"
- **Memory work**: "This is hard. Want to take a break?"

### 4. Enables Conversation
When stuck, have multi-turn dialogue to work through it.

### 5. Stays Editable
- Methodology in markdown (edit anytime)
- Triggers in JSON (adjust sensitivity)
- Changes take effect immediately

---

## Key Innovation

**Methodology-driven coaching**: Unlike generic AI assistants, this coach is grounded in YOUR specific writing methodology. You define what good writing looks like for your practice, and coaching adapts accordingly.

---

## Implementation Status

### ✅ Completed (Design Phase)
- Architecture designed
- All specifications written
- Type definitions created
- Configuration files structured
- Methodology documented
- User documentation complete

### ⏳ To Do (Development Phase)
- [ ] Config Manager (load and watch files)
- [ ] Sensor (monitor writing, calculate metrics)
- [ ] Trigger Engine (evaluate conditions)
- [ ] Claude Client (API integration)
- [ ] Coaching View (UI)
- [ ] Main Plugin (wire everything together)
- [ ] Settings Page
- [ ] Testing

---

## Core Design Principles

### 1. Three-Layer Architecture
```
Sensor (local) → Trigger Engine (local) → Coaching (API)
```
Only the final coaching calls Claude API. Monitoring and decision-making are local.

### 2. Live Configuration
User can edit:
- `methodologies/*.md` - Writing methodology
- `config/writing-types.json` - Type definitions  
- `config/trigger-rules.json` - Trigger rules

Changes reload automatically, no restart needed.

### 3. Context-Aware
Every coaching message includes:
- User's methodology
- Current writing type
- Recent 500 words
- Current metrics
- Trigger type

Claude generates coaching based on all this context.

### 4. Non-Intrusive
- Only intervenes when clearly needed
- Minimum 5 minutes between triggers
- Shows metrics so user understands
- Auto-closes when user starts writing

### 5. Conversational When Needed
Some triggers (like "stuck") open a chat interface where user can have multi-turn dialogue with Claude to work through the block.

---

## Technical Highlights

### Sensor Layer
- Updates metrics every 5 seconds
- Tracks edit history (last 10 minutes)
- Calculates:
  - WPM (rolling 60-second window)
  - Word ratios (adjectives, verbs, abstract nouns)
  - Pause duration and location
  - Deletion patterns
  - Trends (increasing/decreasing)

### Trigger Engine
- Checks conditions every 30 seconds
- Evaluates condition strings: `"> 40"`, `"< 0.05"`, `"increasing"`
- Rate limiting (5 min minimum between triggers)
- Priority system (high-priority can override)
- Type-specific triggers

### Claude Integration
- User provides their own API key
- Cost tracking (~$0.01 per coaching message)
- System prompt includes methodology
- User message includes metrics + content
- Conversation history for multi-turn
- Error handling with user-friendly messages

### Configuration System
- Markdown for methodology (natural to edit)
- JSON for structured config (types, triggers)
- File watching for auto-reload
- Validation with fallback to defaults

---

## Cost Estimate

Based on Claude Sonnet 4.5 pricing:
- Single coaching: ~$0.01
- 3-hour session (10 interventions + 3 conversations): $0.25-0.50
- Monthly (daily writing): $7.5-15

Very affordable. User pays directly via their own API key.

---

## Next Steps

### For Developer (Cursor)
1. Read `CURSOR-START-HERE.md`
2. Read `docs/IMPLEMENTATION.md`
3. Follow `GETTING-STARTED.md` phase-by-phase
4. Build incrementally, test each component

### For User (Jo)
1. Wait for implementation to complete
2. Install plugin in Obsidian
3. Add Claude API key
4. Start writing and testing
5. Edit methodology/config as needed

---

## Future Enhancements

### v2.1
- Multiple methodology support (switch between projects)
- Trigger effectiveness tracking
- Session summaries

### v2.2
- Personalized thresholds (learn from usage)
- Better text analysis (NLP library)
- Integration with daily notes

### v2.3
- Methodology templates
- Community methodology sharing
- Collaborative features

---

## Questions & Support

### Technical Issues
- Check `docs/IMPLEMENTATION.md`
- See `GETTING-STARTED.md`
- Console logs (Ctrl+Shift+I)

### Customization
- See `docs/CUSTOMIZATION.md`
- Edit config files directly
- Changes take effect immediately

### Methodology
- See `methodologies/creative-nonfiction.md`
- Edit as your practice evolves
- Share with others if helpful

---

## Design Philosophy

This tool is designed to:
- **Support, not direct** - Questions, not instructions
- **Adapt, not prescribe** - Your methodology, your way
- **Hold, not fix** - Psychoanalytic holding/containment
- **Evolve, not ossify** - Change as you change

It's not a generic AI assistant. It's a coach that understands YOUR specific writing practice.

---

## Credits

Designed for Jo's creative nonfiction practice, inspired by:
- Psychoanalytic concepts (holding, containment, working through)
- Creative nonfiction writers (Didion, Dillard, Baldwin)
- The observation that writers need understanding, not advice

Built with care for the writing process itself.

---

## Status Summary

📋 **Specification**: Complete  
💻 **Implementation**: Ready to build  
📚 **Documentation**: Complete  
⚙️ **Configuration**: Complete  
🎨 **UI Design**: Specified  
🧪 **Testing Plan**: Documented

**Everything is ready for Cursor to implement. Start with `CURSOR-START-HERE.md`.**
