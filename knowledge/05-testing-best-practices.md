# Testing Best Practices for QA Agents

## Test Planning

### Happy Path First
1. Start with the expected user flow — what should happen when everything works
2. Verify the primary action succeeds without errors
3. Navigate through the complete flow from start to finish
4. Take screenshots at each meaningful step for documentation

### Then Edge Cases
1. Empty states (no data, empty cart, empty search results)
2. Boundary values (max character count, min/max numbers)
3. Invalid inputs (bad email, wrong format, negative numbers)
4. Missing required fields (submit with blank form)
5. Duplicate submissions (double-click submit button)

### Then Error States
1. Network failure scenarios (what happens when API is down?)
2. Invalid data returned from server
3. Session expiry during long forms
4. File upload failures (wrong type, too large, virus scan)

## Console Error Analysis
Check the browser console after every action:
- JavaScript runtime errors (uncaught exceptions)
- Network request failures (4xx, 5xx status codes)
- React warnings (missing keys, state updates, hydration issues)
- CSP (Content Security Policy) violations
- Deprecation warnings
- Mixed content warnings (HTTP on HTTPS pages)

## Visual Regression Checks
- Compare screenshots before and after interactions
- Look for layout shifts (content jumping as images/fonts load)
- Check for overlapping elements
- Verify responsive behavior at different viewport sizes
- Check that CSS animations complete without glitching

## Accessibility Checks During Testing
- Run automated aXe/WAVE scan on critical pages
- Tab through form flows — can you complete the flow without a mouse?
- Check color contrast on any text overlaying images or colored backgrounds
- Verify focus indicators are visible during form interactions
- Check that error messages are programmatically associated with inputs

## Reporting Findings
Each bug report must include:
1. **Title**: Clear, descriptive, actionable
2. **Severity**: critical/high/medium/low/info
3. **Description**: What happened and why it's wrong
4. **Steps to Reproduce**: Numbered, exact steps anyone can follow
5. **Actual vs Expected**: What happened vs what should happen
6. **Console Errors**: Exact error messages from the console
7. **Screenshots**: Visual evidence of the issue
8. **Recommendations**: How to fix it (specific, not generic)

## Severity Definitions
- **Critical**: Blocks core functionality, data loss, security breach, PII exposure
- **High**: Major feature broken, significant usability barrier, no workaround
- **Medium**: Feature partially broken, workaround exists, non-critical path affected
- **Low**: Cosmetic issue, minor accessibility violation, edge case
- **Info**: Suggestion, enhancement, best practice recommendation

## How to Investigate an Element
1. Use browser_snapshot to get the current page state
2. Check for console errors after each interaction
3. Use browser_evaluate with document.querySelectorAll to inspect specific elements
4. Check computed styles for visibility, dimensions, and positioning
5. Verify the element is interactive (not disabled, not hidden)
6. Check aria attributes and roles for accessibility

## What to Check in Every Test Run
1. Page loads without errors (console + network tab)
2. All visible elements render correctly
3. Primary action completes successfully
4. Form validation works (empty, invalid, valid inputs)
5. Error states display appropriate messages
6. Data persists correctly (if applicable)
7. Navigation works (back, forward, direct URL)
8. Responsive layout at desktop viewport
9. Console is clean at end of flow
10. No visible accessibility violations
