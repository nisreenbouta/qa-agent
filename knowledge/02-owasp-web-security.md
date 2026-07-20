# OWASP Top 10 Web Security Risks for QA Testing

## 1. Broken Access Control
- Users should not access resources they are not authorized for
- Test: try accessing admin URLs as a regular user
- Test: modify URL parameters (e.g., /user/123/profile -> /user/456/profile)
- Test: HTTP method manipulation (GET vs POST vs PUT vs DELETE)
- Check: role-based access controls are enforced server-side
- Check: directory listing is disabled
- Check: file permissions and access control headers

## 2. Cryptographic Failures
- All traffic must use HTTPS (check for HSTS header)
- Check for sensitive data in URLs (tokens, passwords in query strings)
- Check for sensitive data exposed in API responses
- Check for weak encryption protocols (TLS 1.0, 1.1 are deprecated)
- Check password storage (should be hashed, not encrypted)
- Check that credit card numbers, SSNs, etc. are masked in UI

## 3. Injection
### SQL Injection
- Input fields that interact with databases are potential vectors
- Test: enter single quote (') in text fields
- Test: enter `' OR 1=1 --` in login fields
- Test: enter `'; DROP TABLE users; --` 
- Signs: database error messages, unexpected behavior

### Cross-Site Scripting (XSS)
- Reflected: input reflected immediately in response
- Stored: input stored and displayed to other users
- DOM-based: client-side scripts modify DOM unsafely
- Test: enter `<script>alert(1)</script>` in all input fields
- Test: enter `<img src=x onerror=alert(1)>`
- Test: enter `javascript:alert(1)` in URL fields
- Check: output is properly encoded (HTML entity encoding)

## 4. Insecure Design
- Rate limiting should prevent brute force attacks
- Password complexity requirements should be enforced
- Account lockout after failed attempts
- Secure password reset flow (no token in URL, expiry on token)
- Multi-factor authentication for sensitive operations

## 5. Security Misconfiguration
- Default credentials must be changed
- Error pages should not leak stack traces or server info
- Security headers must be present:
  - Content-Security-Policy
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security
  - X-Frame-Options: DENY or SAMEORIGIN
  - Referrer-Policy
- Unused pages, components, and features should be disabled

## 6. Vulnerable Components
- Check for outdated JavaScript libraries
- Check for known CVEs in dependencies
- Check for SRI (Subresource Integrity) on external scripts

## 7. Identification and Authentication Failures
- Session tokens should be HttpOnly, Secure, SameSite
- Session timeout should be implemented
- No hardcoded credentials or API keys in client-side code
- Password fields must have autocomplete="off" or "new-password"
- No credential stuffing protections (rate limiting, CAPTCHA)

## 8. Software Integrity Failures
- External resources should use SRI hashes
- Update mechanisms should verify integrity
- CI/CD pipeline should have security checks

## 9. Logging and Monitoring Failures
- Failed login attempts should be logged
- Suspicious activity should trigger alerts
- Audit logs should be tamper-proof
- Logs should exclude sensitive data (passwords, PII)

## 10. Server-Side Request Forgery (SSRF)
- URLs fetched from user input are potential vectors
- Check: internal network requests from user-provided URLs
- Check: URL validation and allowlisting

## QA Security Testing Checklist
1. Enter special characters in all text fields (', ", <, >, &, --)
2. Try path traversal (../../../etc/passwd)
3. Manipulate URL parameters and IDs
4. Inspect network responses for data leakage
5. Check all security headers in response
6. Verify HTTPS is enforced (HTTP -> HTTPS redirect)
7. Test password policy enforcement
8. Check session timeout behavior
9. Try to access authenticated pages without login
10. Verify file upload restrictions
