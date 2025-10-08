# Security Policy

## 🔒 Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## 🚨 Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **security@example.com** (replace with your email)

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

### What to include in your report

Please include the following information in your report:

- Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the manifestation of the issue
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## 🛡️ Security Update Policy

When we receive a security bug report, we will:

1. **Confirm the problem** and determine the affected versions
2. **Audit code** to find any potential similar problems
3. **Prepare fixes** for all supported releases
4. **Release new security patch** versions as soon as possible

## 🔐 Security Best Practices

When using MCP Accelerator, we recommend:

### Input Validation

Always validate tool inputs with Zod schemas:

```typescript
inputSchema: z.object({
  data: z.string().max(1000), // Limit input size
  email: z.string().email(),   // Validate format
})
```

### Authentication

For HTTP/WebSocket transports, implement authentication:

```typescript
server.registerMiddleware({
  name: 'auth',
  priority: 100,
  async handler(message, context, next) {
    // Verify authentication token
    if (!isValidToken(context.headers?.authorization)) {
      throw new Error('Unauthorized');
    }
    await next();
  },
});
```

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
const rateLimitPlugin = {
  name: 'rate-limit',
  async initialize(server) {
    // Implement rate limiting logic
  },
};
```

### Sensitive Data

Never log sensitive information:

```typescript
handler: async (input, context) => {
  // ❌ Don't do this
  context.logger.info('Processing', { password: input.password });
  
  // ✅ Do this instead
  context.logger.info('Processing user authentication');
}
```

### Dependencies

Keep dependencies up-to-date:

```bash
npm audit
npm audit fix
```

## 📜 Disclosure Policy

- We will acknowledge receipt of your vulnerability report within 48 hours
- We will provide an estimated timeline for a fix
- We will notify you when the vulnerability is fixed
- We will publicly disclose the vulnerability after a fix is released (unless you request otherwise)

## 🏆 Security Hall of Fame

We thank the following people for responsibly disclosing security issues:

<!-- List will be populated as issues are reported -->

---

## 🔍 Known Security Considerations

### Transport Security

- **STDIO**: Inherits security of parent process
- **HTTP**: Use HTTPS in production, implement authentication
- **WebSocket**: Use WSS in production, validate origins
- **SSE**: Use HTTPS in production, implement authentication

### Tool Execution

- Tools execute in the same process as the server
- Ensure tool handlers don't expose sensitive data
- Validate all inputs rigorously
- Consider sandboxing for untrusted tool code

## 📚 Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [npm Security](https://docs.npmjs.com/cli/v8/commands/npm-audit)

---

**Last Updated**: January 8, 2025
