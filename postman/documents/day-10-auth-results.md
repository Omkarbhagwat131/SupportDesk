# Day 10 Authentication Test Results

**Run:** 2026-11-14 · **Target:** local API and test database · **Method:** local integration requests (not Postman Runner)  
Passwords, tokens, hashes, and account IDs are intentionally omitted.

<table>
<thead>
<tr><th>Test</th><th>Request / check</th><th>Expected</th><th>Actual</th><th>Result</th></tr>
</thead>
<tbody>
<tr><td>AUTH-01 Register</td><td><code>POST /api/auth/register</code></td><td><code>201</code>; safe customer</td><td><code>201</code>; CUSTOMER; no hash</td><td>PASS</td></tr>
<tr><td>AUTH-02 Duplicate email</td><td><code>POST /api/auth/register</code></td><td><code>409</code> conflict</td><td><code>409</code>; EMAIL_ALREADY_REGISTERED</td><td>PASS</td></tr>
<tr><td>AUTH-03 Invalid input</td><td><code>POST /api/auth/register</code></td><td><code>400</code> validation error</td><td><code>400</code>; VALIDATION_ERROR</td><td>PASS</td></tr>
<tr><td>AUTH-04 Password storage</td><td>Local database check</td><td>Hash stored; plaintext absent</td><td>Stored; bcrypt format; plaintext absent</td><td>PASS</td></tr>
<tr><td>AUTH-05 Login</td><td><code>POST /api/auth/login</code></td><td><code>200</code>; bearer token</td><td><code>200</code>; token returned; safe user</td><td>PASS</td></tr>
<tr><td>AUTH-06 Wrong password</td><td><code>POST /api/auth/login</code></td><td>Generic <code>401</code></td><td><code>401</code>; INVALID_CREDENTIALS</td><td>PASS</td></tr>
<tr><td>AUTH-07 Unknown email</td><td><code>POST /api/auth/login</code></td><td>Same error as wrong password</td><td><code>401</code>; same code and message</td><td>PASS</td></tr>
<tr><td>AUTH-08 No token</td><td><code>GET /api/tickets</code></td><td><code>401</code></td><td><code>401</code>; UNAUTHORIZED</td><td>PASS</td></tr>
<tr><td>AUTH-09 Bad token</td><td><code>GET /api/tickets</code></td><td><code>401</code></td><td><code>401</code>; UNAUTHORIZED</td><td>PASS</td></tr>
<tr><td>AUTH-10 Expired token</td><td><code>GET /api/tickets</code></td><td><code>401</code></td><td><code>401</code>; UNAUTHORIZED</td><td>PASS</td></tr>
<tr><td>AUTH-11 Create own ticket</td><td><code>POST /api/tickets</code></td><td><code>201</code>; owned by caller</td><td><code>201</code>; requester matched caller</td><td>PASS</td></tr>
<tr><td>AUTH-12 Customer delete</td><td><code>DELETE /api/tickets/:id</code></td><td><code>403</code></td><td><code>403</code>; FORBIDDEN</td><td>PASS</td></tr>
<tr><td>AUTH-13 Read own ticket</td><td><code>GET /api/tickets/:id</code></td><td><code>200</code></td><td><code>200</code>; own ticket returned</td><td>PASS</td></tr>
<tr><td>AUTH-14 Read another's ticket</td><td><code>GET /api/tickets/:id</code></td><td><code>404</code>; no data leak</td><td><code>404</code>; data is null</td><td>PASS</td></tr>
<tr><td>AUTH-15 Agent ticket list</td><td><code>GET /api/tickets</code></td><td><code>200</code>; all tickets</td><td><code>200</code>; both customers' tickets visible</td><td>PASS</td></tr>
<tr><td>AUTH-16 Sensitive fields</td><td>Register, login, ticket responses</td><td>No hash or secret</td><td>Neither exposed</td><td>PASS</td></tr>
<tr><td>AUTH-17 CORS</td><td>Approved / unapproved origins</td><td>Allow approved only</td><td>Approved allowed; unapproved denied</td><td>PASS</td></tr>
<tr><td>AUTH-18 Login limit</td><td>Repeated <code>POST /api/auth/login</code></td><td><code>429</code> within limit window</td><td><code>429</code>; RATE_LIMITED</td><td>PASS</td></tr>
<tr><td>AUTH-19 Security headers</td><td>API response headers</td><td>Helmet headers present</td><td>nosniff; SAMEORIGIN</td><td>PASS</td></tr>
</tbody>
</table>

**Overall: 19/19 passed.** The rate limit was reached on check request 5 because earlier login attempts from the same IP counted toward the 15-minute window.

**Other verification:** API build passed; 31 automated tests passed; production dependency audit found 0 vulnerabilities. These results are not Postman screenshots.

> In VS Code, open the rendered table with **Ctrl+Shift+V** (Markdown: Open Preview).
