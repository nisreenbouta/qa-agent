# Browser Console Error Reference for QA

## JavaScript Runtime Errors

### TypeError: Cannot read properties of undefined/null
**Meaning**: Code tried to access a property on undefined or null.
**What to check**: API response missing expected field, element not found on page, variable not initialized before use.
**Example**: `document.querySelector('.button').click()` when `.button` doesn't exist.

### TypeError: X is not a function
**Meaning**: A value was called as a function but isn't one.
**What to check**: Variable shadowing, wrong import, incorrect type passed to callback.
**Example**: Calling `obj.method()` where `method` is actually a string or number.

### ReferenceError: X is not defined
**Meaning**: Variable referenced but never declared in scope.
**What to check**: Missing import, typo in variable name, script loaded out of order.
**Example**: `console.log(myVar)` where `myVar` was never declared.

### SyntaxError: Unexpected token
**Meaning**: JSON.parse failed or JS has syntax error.
**What to check**: API returning HTML instead of JSON, malformed JSON, trailing comma.
**Example**: `JSON.parse("{invalid}")`.

### RangeError: Maximum call stack size exceeded
**Meaning**: Infinite recursion or very deep recursion.
**What to check**: Recursive function without base case, circular reference in component re-rendering.

## Network Errors

### Failed to fetch / NetworkError
**Meaning**: fetch() or XHR request failed at network level.
**What to check**: CORS configuration, server availability, ad blocker interfering, browser extension blocking request.

### net::ERR_CONNECTION_REFUSED
**Meaning**: Server actively refused connection (not running, wrong port, firewall).
**What to check**: Server is running, port is correct, no firewall blocking.

### net::ERR_CONNECTION_TIMED_OUT
**Meaning**: Request sent but no response received within timeout.
**What to check**: Server overloaded, network latency, server location (DNS).

### net::ERR_ABORTED
**Meaning**: Request was cancelled (navigation away, user cancelled, new request replaced it).
**What to check**: Normal in SPAs (race conditions), but flag if critical requests abort.

### net::ERR_CERT_AUTHORITY_INVALID
**Meaning**: SSL certificate error.
**What to check**: Expired certificate, self-signed in production, wrong domain.

## HTTP Status Codes

### 4xx Client Errors
- **400 Bad Request**: malformed request syntax or invalid parameters
- **401 Unauthorized**: authentication required or failed
- **403 Forbidden**: authenticated but no permission
- **404 Not Found**: endpoint doesn't exist
- **405 Method Not Allowed**: wrong HTTP method (GET vs POST)
- **409 Conflict**: version conflict, duplicate resource
- **422 Unprocessable Entity**: validation errors
- **429 Too Many Requests**: rate limited

### 5xx Server Errors
- **500 Internal Server Error**: generic server failure
- **502 Bad Gateway**: upstream server returned invalid response
- **503 Service Unavailable**: server overloaded or under maintenance
- **504 Gateway Timeout**: upstream server didn't respond in time

## React-Specific Warnings

### "Each child in a list should have a unique key"
**Severity**: Warning (low-medium).
**Impact**: Poor re-render performance, potential state bugs with list reordering.
**Detect**: Look for `.map()` calls without `key` prop or using index as key.

### "Cannot update a component while rendering"
**Severity**: Error (high).
**Impact**: Infinite re-render loop, frozen browser tab.
**Detect**: State updates happening inside render body instead of useEffect.

### "Hydration failed because the initial UI does not match"
**Severity**: Error (high).
**Impact**: Mismatched server/client HTML, flicker, broken interactivity.
**Detect**: Browser-specific code (window, localStorage) used in initial render.

### "Warning: React does not recognize the X prop on a DOM element"
**Severity**: Warning (low).
**Impact**: Extra attributes on DOM, potential HTML validation issues.
**Detect**: Passing non-standard props to HTML elements instead of React components.

## CSS & Rendering Issues

### ResizeObserver loop limit exceeded
**Meaning**: ResizeObserver callback took too long or caused a loop.
**Severity**: Benign (but indicates layout thrashing).
**What to check**: Infinite resize loops, heavy layout calculations in observer.

### Layout Instability (CLS) > 0.1
**Meaning**: Cumulative Layout Shift score above threshold.
**Impact**: Poor user experience, images/videos without dimensions, late-loading ads/fonts.
**What to check**: Set width/height on images, reserve space for ads/embeds.

## Security Warnings

### "Mixed Content"
**Meaning**: Loading HTTP resources on an HTTPS page.
**Severity**: High (data integrity risk, browser may block).
**Check**: All scripts, styles, images, fonts, API calls should use HTTPS.

### Content Security Policy (CSP) Violation
**Meaning**: Inline script, eval, or resource from unauthorized origin was blocked.
**Severity**: Medium-High.
**Check**: CSP headers in response, inline scripts need nonce or hash.

### "This page is using X that has known security vulnerabilities"
**Meaning**: Known CVE in library.
**Severity**: High-Critical.
**Check**: Update the library, check Snyk/npm audit.

## Testing Protocol
When investigating console errors during a test:
1. Note the exact error message (copy it)
2. Note the file and line number if available
3. Note what user action triggered it
4. Check if the error blocks functionality or is cosmetic
5. Check if the error appears consistently or intermittently
6. Include the full error text in the bug report
