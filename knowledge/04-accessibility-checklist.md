# Accessibility Testing Checklist

## Automated Checks (Run First)
- [ ] Run axe-core or WAVE on every page
- [ ] Check HTML validation (no duplicate IDs, proper nesting)
- [ ] Verify color contrast ratios (minimum 4.5:1 text, 3:1 large text)
- [ ] Check all images have appropriate alt text
- [ ] Verify form inputs have associated labels
- [ ] Check ARIA attributes are valid and properly used
- [ ] Verify heading levels are sequential (no skipping h1->h3)

## Keyboard Testing
- [ ] Tab through entire page — visible focus indicator on every element
- [ ] All interactive elements reachable via keyboard (Tab, Shift+Tab)
- [ ] All interactive elements operable via keyboard (Enter, Space, Arrow keys)
- [ ] No keyboard traps (focus must be able to leave every component)
- [ ] Custom widgets support expected keyboard interactions
- [ ] Dropdowns, modals, date pickers work without a mouse
- [ ] Escape key closes modals, menus, popups
- [ ] Focus moves to logical next element after action

## Screen Reader Testing (NVDA/VoiceOver)
- [ ] Page content reads in logical order (DOM order, not visual order)
- [ ] Landmarks (header, nav, main, footer) are announced
- [ ] Headings provide a table of contents of the page
- [ ] Links are meaningful out of context ("Learn more" vs "Read pricing")
- [ ] Images convey their purpose via alt text
- [ ] Dynamic content updates are announced (aria-live regions)
- [ ] Form errors are announced and associated with the input
- [ ] Modal/dialog is announced when opened; focus trapped inside
- [ ] Menu/combobox states (expanded/collapsed) are announced

## Visual Testing
- [ ] Zoom to 200% — no horizontal scroll, no content clipping
- [ ] Zoom to 400% — content still usable (may need horizontal scroll)
- [ ] Browser default font size (16px) — text is readable
- [ ] No information conveyed solely by color (error states, charts)
- [ ] Focus indicator is at least 2px thick with good contrast against background
- [ ] Touch targets at least 44x44 CSS pixels on mobile
- [ ] Motion/animation respects prefers-reduced-motion

## Forms
- [ ] Every input has a visible label
- [ ] Required fields are indicated (not just by color)
- [ ] Error messages are clear, specific, and programmatically associated
- [ ] Error list at top of form for screen reader context
- [ ] Autocomplete attributes on appropriate fields (name, email, address)
- [ ] Password field allows toggling visibility
- [ ] CAPTCHA has alternative (audio or logic-based)

## Content
- [ ] Link text makes sense out of context
- [ ] Instructions don't rely on sensory characteristics ("click the green button")
- [ ] Language of page is set (lang attribute on <html>)
- [ ] Abbreviations and jargon have definitions
- [ ] Tables have proper headers (scope, caption, summary if complex)
- [ ] Lists are marked up as <ul>/<ol> not just styled divs

## Common Failures to Flag
1. Missing focus indicator or very faint outline
2. Tab order jumps around the page
3. Dropdown menu that requires hover (no keyboard access)
4. Very light gray text on white background
5. form fields without labels (placeholder only)
6. Auto-playing video without pause control
7. Content that flashes or moves continuously
8. PDF documents without accessible tags
9. CAPTCHA without audio alternative
10. Status messages not announced (loading, success, error)

## Severity Guidelines for Accessibility Issues
- **Critical**: Content completely inaccessible to assistive technology (keyboard trap, missing alt on critical image, form can't be submitted via keyboard)
- **High**: Major barrier but workaround exists (poor color contrast, missing form labels, non-descriptive link text)
- **Medium**: Fails guideline but doesn't block core functionality (heading levels skipped, decorative image missing empty alt)
- **Low**: Minor violation, best practice failure (redundant ARIA, minor contrast miss)
