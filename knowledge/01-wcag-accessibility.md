# WCAG 2.2 Quick Reference for QA Testing

## Perceivable

### Text Alternatives (Guideline 1.1)
- All non-text content must have a text alternative (alt text for images, labels for icons)
- Decorative images must have empty alt text (alt="")
- CAPTCHAs need alternatives for multiple senses

### Time-Based Media (Guideline 1.2)
- Pre-recorded video needs captions and audio descriptions
- Live video needs captions
- No auto-playing video/audio that lasts >3 seconds without a pause mechanism

### Adaptable (Guideline 1.3)
- Information and relationships must be preserved when presentation changes
- Content must make sense when linearized (screen reader order)
- Instructions should not rely solely on sensory characteristics (shape, color, size, sound, location)

### Distinguishable (Guideline 1.4)
- Color alone must not convey information
- Minimum contrast ratio: 4.5:1 for normal text, 3:1 for large text (18px+ or 14px bold+)
- Contrast ratio for UI components and graphical objects: 3:1
- Text resizing up to 200% without loss of content or functionality
- Images of text are not allowed (except logos)
- No content that flashes more than 3 times per second

## Operable

### Keyboard Accessible (Guideline 2.1)
- All functionality must be operable via keyboard
- No keyboard traps (focus must be able to leave any component)
- Keyboard focus order must be logical and intuitive

### Enough Time (Guideline 2.2)
- Time limits must have a mechanism to turn off, adjust, or extend
- Moving/auto-updating content must have pause/stop/hide mechanism
- No timed responses unless essential

### Seizures and Physical Reactions (Guideline 2.3)
- No content that flashes more than 3 times per second
- Flashing content must be below the general flash threshold

### Navigable (Guideline 2.4)
- Skip navigation link must be present and functional
- Page titles must be descriptive
- Link text must be meaningful out of context
- Multiple ways to find pages (site map, search, navigation)
- Headings and labels must be descriptive
- Focus indicator must be visible (minimum 2px outline recommended)

### Input Modalities (Guideline 2.5)
- All functionality must be operable with a single pointer
- No path-based gestures required (swipe patterns)
- Button/link targets must be at least 24x24 CSS pixels
- Labels must match accessible names

## Understandable

### Readable (Guideline 3.1)
- Page language must be declared (lang attribute on html element)
- Parts in different languages must be identified
- Unusual/restricted words must have definitions
- Abbreviations must be defined

### Predictable (Guideline 3.2)
- Navigation must be consistent across pages
- Components with the same label must behave the same
- No context changes on focus or input without warning

### Input Assistance (Guideline 3.3)
- Errors must be identified and described in text
- Input labels and instructions must be provided
- Suggestions for error correction when possible
- Error prevention for legal/financial/data submissions (confirm/reversal)

## Robust

### Compatible (Guideline 4.1)
- All HTML must parse correctly (no duplicate IDs, proper nesting)
- ARIA attributes must be valid and used correctly
- Status messages must be programmatically determinable (role="status", aria-live)

## Common ARIA Mistakes
- Do not use role="presentation" or aria-hidden="true" on focusable elements
- aria-label only works on elements with an accessible name
- aria-labelledby takes precedence over aria-label
- Do not override semantic HTML roles (use <button> not <div role="button">)
- aria-live="polite" for non-critical updates, "assertive" for urgent

## Testing Checklist
1. Tab through the entire page — can you see where you are?
2. All interactive elements must be reachable and operable by keyboard
3. Screen reader: does it read content in a logical order?
4. Zoom to 200% — no horizontal scroll or content loss
5. Turn off images — do alt texts convey meaning?
6. Turn off CSS — does the page structure still make sense?
7. Check color contrast with a contrast checker tool
8. Ensure no content is conveyed only through color
9. Check that all form inputs have labels
10. Validate HTML for parsing errors
