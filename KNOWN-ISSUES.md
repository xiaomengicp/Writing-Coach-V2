# Writing Coach - Known Issues & Future Enhancements

## Known Issues

### WPM Calculation May Spike
- **Symptom**: WPM shows unrealistic values (100+)
- **Cause**: Text diff algorithm is too simple - assumes text is always added at end
- **Workaround**: None currently
- **Fix Needed**: Implement proper diff algorithm for mid-text edits and paste operations

### Chinese Text Analysis Not Supported
- **Current**: Adjective/abstract noun detection uses English word lists
- **Impact**: Adj % and Abstract % metrics will be inaccurate for Chinese text
- **Future**: Add Chinese NLP with jieba or similar library

## Completed Fixes

- [x] CORS error fixed (using Obsidian's `requestUrl`)
- [x] Chinese WPM calculation (0.5 weight per character)
- [x] Initial file load excluded from WPM count
- [x] Coach panel UI working

## Future Enhancements

1. **Chinese NLP Support**
   - Integrate jieba for Chinese word segmentation
   - Create Chinese adjective/abstract noun word lists
   - Add proper word counting for Chinese

2. **Improved WPM Calculation**
   - Use real diff algorithm (e.g., diff-match-patch)
   - Detect and ignore paste operations
   - Better handling of mid-text edits

3. **Additional Features**
   - Session statistics persistence
   - Writing history tracking
   - Custom trigger rules via UI
