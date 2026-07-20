# Common Web UI & Functional Bug Patterns

## Form Validation Bugs
- Form submits with empty required fields (missing client-side validation)
- Validation errors disappear before user reads them
- Incorrect field format validation (email accepts "a@b", phone accepts letters)
- Validation only on client side (bypassable with curl/Postman)
- Password confirmation matching not enforced
- Character limits not enforced or wrong (allows more/less than expected)
- Whitespace not trimmed (email " user@example.com" treated as different)
- Input fields accept negative numbers, zero, or out-of-range values
- Date picker allows impossible dates (Feb 30)
- File upload accepts wrong types or exceeds size limit

## Navigation & Routing Bugs
- Browser back button breaks the app (blank page, broken state)
- Direct URL access bypasses required steps
- Page reload loses state (form data, wizard progress)
- Incorrect active tab/state indication in navigation
- Scroll position not preserved on navigation
- Hash/anchor links don't scroll to correct position
- 404 page is generic or missing

## Responsive & Layout Bugs
- Horizontal scroll appears at common breakpoints (768px, 1024px)
- Text overflows its container (single long word breaks layout)
- Images stretch or distort at various viewport sizes
- Sticky/fixed headers cover content when scrolled
- Elements overlap at certain viewport widths
- Mobile hamburger menu doesn't close on link click
- Touch targets too small (< 44x44px recommended)
- Font sizes too small on mobile (below 16px causes iOS zoom)

## State & Data Consistency Bugs
- Optimistic updates show stale data
- Pagination resets unexpectedly (after action, on browser back)
- Sorting/filtering shows wrong counts or duplicates
- Search returns inconsistent results (accents, case sensitivity, partial matches)
- Data not refreshed after CRUD operations
- Concurrent edits cause data loss (last writer wins)
- Loading states flash too briefly (perceived performance issue)

## Error Handling Bugs
- Generic error messages with no actionable information
- Error toasts auto-dismiss before user can read them
- Network errors not caught (silent failures)
- Timeout not handled (loading spinner forever)
- 500 errors show raw stack traces in production
- Offline mode not handled gracefully

## Performance & Resource Bugs
- Images not lazy loaded (page loads all assets at once)
- Large unoptimized images (slow page load)
- Memory leaks (SPA usage grows over time, DOM not cleaned)
- Unnecessary API calls (same data fetched multiple times)
- Infinite scroll triggers repeated requests at boundary
- Layout shift (CLS) from images without dimensions

## Console Error Patterns
### JavaScript Errors
- `Cannot read property 'X' of undefined` — missing null checks
- `X is not a function` — wrong type passed to function
- `Unexpected token` — JSON parse failure from bad API response
- `Failed to fetch` / `NetworkError` — CORS, network, or endpoint issues
- `ResizeObserver loop limit exceeded` — benign but indicates layout thrashing

### React-Specific Errors
- `Warning: Each child in a list should have a unique key` — missing key prop
- `Warning: Cannot update during an existing state transition` — state update in render
- `Error: Too many re-renders` — infinite loop in useEffect/useCallback
- `Hydration failed` — server/client mismatch in SSR

### API/Network Errors
- 4xx responses: bad request, unauthorized, not found, rate limited
- 5xx responses: server errors
- CORS errors: missing Access-Control-Allow-Origin header
- Failed to load resource: net::ERR_CONNECTION_REFUSED
- Mixed content: loading HTTP content on HTTPS page

## Accessibility Bug Patterns
- Missing alt text on images (screen reader reads filename)
- Focus indicator invisible (keyboard users can't navigate)
- Tab order out of sequence (keyboard navigation jumps randomly)
- Missing form labels (screen reader can't identify input purpose)
- Low contrast text (hard to read for low-vision users)
- No skip navigation link (keyboard users tab through entire nav)
- ARIA roles misused (e.g., role="alert" on non-live region)
- Interactive elements not keyboard accessible (mouse-only hover menus)
- Heading levels skipped (h1 -> h3 with no h2)
