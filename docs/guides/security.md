# Security & Hardening

MCP Accelerator helps you deliver secure Model Context Protocol servers by composing middleware, transport guards, and lifecycle hooks. This guide consolidates the practices from the root `SECURITY.md` into the documentation site so you can keep operations, compliance, and development aligned.

## Threat Model

- **Untrusted clients** may send malformed JSON-RPC envelopes, replay requests, or abuse capabilities (`tools/list`, `resources/read`, `prompts/get`).
- **Network attackers** target unsecured transports with brute-force or denial-of-service attempts.
- **Insider risks** emerge when plugins or tools load dynamic code without verification.

Our goal is to detect, rate-limit, and isolate these vectors without violating the [Model Context Protocol](https://modelcontextprotocol.io/docs/getting-started/intro) handshake and capability requirements.

## Default Security Stack

`applyDefaultSecurity` configures the following middleware if packages are available:

| Middleware | Purpose | Environment variables |
|------------|---------|-----------------------|
| `@mcp-accelerator/middleware-auth` | JWT and API key authentication | `MCP_JWT_SECRET`, `MCP_JWT_AUDIENCE`, `MCP_API_KEYS` |
| `@mcp-accelerator/middleware-ratelimit` | Token bucket rate limiting | `MCP_RATE_LIMIT_MAX`, `MCP_RATE_LIMIT_WINDOW_MS` |
| `@mcp-accelerator/middleware-observability` | Logging, tracing, metrics | `OTEL_SERVICE_NAME`, exporters |
| `@mcp-accelerator/middleware-resilience` (optional) | Circuit breaker, retries, timeouts | `MCP_RESILIENCE_*` (custom) |

### Step-by-Step Hardening

1. **Install dependencies**
   ```bash
   npm install \
     @mcp-accelerator/middleware-auth \
     @mcp-accelerator/middleware-ratelimit \
     @mcp-accelerator/middleware-observability \
     @mcp-accelerator/middleware-resilience
   ```
2. **Set minimal environment**
   ```bash
   export MCP_JWT_SECRET=$(openssl rand -hex 32)
   export MCP_API_KEYS="ops-readonly,tooling-ci"
   export MCP_RATE_LIMIT_MAX=120
   export MCP_RATE_LIMIT_WINDOW_MS=60000
   ```
3. **Wire the helper**
   ```typescript
   import { createServer, applyDefaultSecurity } from 'mcp-accelerator';

   const server = createServer({
     name: 'secure-mcp',
     version: '1.0.0',
   });

   await applyDefaultSecurity(server, {
     auth: {
       jwt: {
         secret: process.env.MCP_JWT_SECRET,
         audience: process.env.MCP_JWT_AUDIENCE?.split(','),
       },
       apiKey: {
         keys: process.env.MCP_API_KEYS?.split(',').map((value) => value.trim()),
       },
     },
     rateLimit: {
       max: Number(process.env.MCP_RATE_LIMIT_MAX ?? 60),
       windowMs: Number(process.env.MCP_RATE_LIMIT_WINDOW_MS ?? 60000),
     },
   });
   ```
4. **Upgrade transports**
   - HTTP: enable TLS (`https` options), set `trustProxy`, and enforce `X-Forwarded-Proto`.
   - WebSocket: configure `allowedOrigins` and `perMessageDeflate` limits.
   - SSE/STDIO: guard file descriptors and timeouts.
5. **Run `mcp-accelerator doctor`**
   ```bash
   npx mcp-accelerator doctor --project . 
   ```
   The doctor surfaces missing scripts, tests, or directory structures that would weaken operational readiness.

## Architecture Overview

```mermaid
flowchart TD
  Client[[MCP Client]]
  Gateway{Transport Guard}
  Auth[Authentication Middleware]
  RateLimit[Rate Limit Middleware]
  Resilience[Resilience Middleware]
  Tools[Tool Handler]
  Resources[Resource Provider]
  Prompts[Prompt Provider]

  Client --> Gateway --> Auth --> RateLimit --> Resilience --> Tools
  Resilience --> Resources
  Resilience --> Prompts

  Auth -. metrics/logs .-> Observability[(Observability Stack)]
  RateLimit -. metrics/logs .-> Observability
  Tools -. audit -> PluginManager[(Plugin Manager)]
```

- **Transport guard** validates protocol version, capabilities, and payload size before passing control to middleware.
- **Authentication** attaches identity metadata (`StrictMetadata.user`) so tools can authorize actions.
- **Rate limiting** enforces tenant fairness and protects downstream services.
- **Resilience** wraps tool execution with retries, circuit breakers, and timeouts.
- **Plugin manager** records audit events (`install`, `activate`, `deactivate`) so you can investigate incidents.

## Secrets & Key Management

- Store secrets in the platform (Kubernetes secrets, AWS Parameter Store, HashiCorp Vault). Inject them via environment variables or secret volumes.
- Rotate JWT keys and API keys regularly. Use versioned secrets and update clients gracefully.
- Never check secrets into version control. `mcp-accelerator doctor` warns when `.env` is missing from `.gitignore`.

## Plugin Supply Chain

- Validate plugin manifests before installation. `PluginManager.installFromManifest` checks integrity (checksums) and tracks audit logs.
- Run plugins in a restricted environment; prefer loading them from signed packages.
- Keep a policy file describing which lifecycle hooks each plugin can register. Decline unknown phases to maintain MCP compliance.

## Incident Response

- Enable structured logging (JSON) with correlation IDs.
- Subscribe to `hookPhase` error events to trigger automated alerts.
- Use audit logs exported by the plugin manager to trace unauthorized activations or configuration drifts.

## Continuous Compliance

1. Run `npm test` with CLI coverage to guarantee scaffolding stays healthy.
2. Execute security scans (`npm audit`, `snyk`) during CI.
3. Verify that `ServerCapabilities` align with deployed features—do not claim `resources` or `prompts` when providers are disabled.
4. Document runbooks for key recovery, telemetry outages, and rate-limit tuning.

By following this checklist, your MCP server remains predictable, auditable, and aligned with the protocol spec even as you add transports, middleware, and custom tools.
