# Transport Layer

MCP Accelerator supports multiple transport mechanisms to communicate with MCP clients. This guide covers all available transports and helps you choose the right one for your use case.

## 🚀 Available Transports

### 1. HTTP Transport

**Best for:** REST APIs, web applications, and standard HTTP clients.

```typescript
import { HTTPTransport } from '@mcp-accelerator/transport-http';

const transport = new HTTPTransport({
  port: 3000,
  host: 'localhost',
  serverOptions: {
    logger: true,
    trustProxy: true,
    https: {
      key: fs.readFileSync('private.key'),
      cert: fs.readFileSync('certificate.crt')
    }
  }
});
```

**Features:**
- Built on Fastify for high performance
- TLS/HTTPS support
- Request/response logging
- Configurable timeouts
- CORS support
- Rate limiting

**Endpoints:**
- `POST /tools/:toolName` - Execute a tool
- `GET /tools` - List available tools
- `GET /health` - Health check
- `GET /metrics` - Prometheus metrics

### 2. WebSocket Transport

**Best for:** Real-time applications, chat systems, and interactive tools.

```typescript
import { WebSocketTransport } from '@mcp-accelerator/transport-websocket';

const transport = new WebSocketTransport({
  port: 3000,
  host: 'localhost',
  pingInterval: 30000,
  maxConnections: 100,
  compression: true
});
```

**Features:**
- Bidirectional real-time communication
- Automatic ping/pong for connection health
- Connection pooling and management
- Compression support
- Custom message routing

### 3. Server-Sent Events (SSE) Transport

**Best for:** One-way streaming, progress updates, and long-running operations.

```typescript
import { SSETransport } from '@mcp-accelerator/transport-sse';

const transport = new SSETransport({
  port: 3000,
  host: 'localhost',
  keepAlive: true,
  retry: 3000
});
```

**Features:**
- Server-to-client streaming
- Automatic reconnection
- Event-based communication
- Built-in keep-alive
- Browser-native support

### 4. STDIO Transport

**Best for:** Command-line tools, CLI applications, and direct integration.

```typescript
import { STDIOTransport } from '@mcp-accelerator/transport-stdio';

const transport = new STDIOTransport({
  // Uses standard input/output streams
});
```

**Features:**
- Direct stdin/stdout communication
- No network overhead
- Perfect for CLI tools
- Simple integration with existing tools

## 🔧 Transport Configuration

### Common Options

All transports share these common configuration options:

```typescript
interface TransportConfig {
  port?: number;
  host?: string;
  timeout?: number;
  maxConnections?: number;
  logger?: Logger;
}
```

### HTTP-Specific Options

```typescript
interface HTTPTransportConfig extends TransportConfig {
  serverOptions?: FastifyServerOptions;
  cors?: CORSOptions;
  rateLimit?: RateLimitOptions;
  healthCheck?: HealthCheckOptions;
}
```

### WebSocket-Specific Options

```typescript
interface WebSocketTransportConfig extends TransportConfig {
  pingInterval?: number;
  pongTimeout?: number;
  compression?: boolean;
  perMessageDeflate?: boolean;
  maxPayload?: number;
}
```

## 🎯 Choosing the Right Transport

### Use HTTP Transport When:
- Building REST APIs
- Need standard HTTP semantics
- Working with web browsers
- Require caching and proxies
- Need TLS/SSL encryption
- Building microservices

### Use WebSocket Transport When:
- Need real-time communication
- Building chat applications
- Require bidirectional streaming
- Working with gaming applications
- Need low-latency communication
- Building collaborative tools

### Use SSE Transport When:
- Broadcasting updates to clients
- Showing progress of long operations
- Building dashboard applications
- Need one-way streaming
- Working with browser EventSource API
- Implementing real-time notifications

### Use STDIO Transport When:
- Building command-line tools
- Integrating with existing CLI tools
- Need direct process communication
- Building development tools
- Working in serverless environments
- Creating automation scripts

## 📝 Implementation Examples

### HTTP Server with Authentication

```typescript
import { MCPServer } from '@mcp-accelerator/core';
import { HTTPTransport } from '@mcp-accelerator/transport-http';
import { JWTAuthMiddleware } from '@mcp-accelerator/middleware-auth';

const server = new MCPServer({
  name: 'Secure HTTP Server',
  version: '1.0.0'
});

// Add authentication
server.use(new JWTAuthMiddleware({
  secret: process.env.JWT_SECRET,
  algorithms: ['HS256']
}));

// Configure HTTP transport
const transport = new HTTPTransport({
  port: 3000,
  serverOptions: {
    https: {
      key: fs.readFileSync('private.key'),
      cert: fs.readFileSync('certificate.crt')
    },
    trustProxy: true,
    requestTimeout: 30000
  }
});

await server.start(transport);
```

### WebSocket Server with Real-time Features

```typescript
import { WebSocketTransport } from '@mcp-accelerator/transport-websocket';

const transport = new WebSocketTransport({
  port: 3000,
  pingInterval: 30000,
  maxConnections: 1000,
  compression: true
});

// Handle connection events
transport.on('connection', (client) => {
  console.log('Client connected:', client.id);
  
  // Send welcome message
  client.send({
    type: 'welcome',
    message: 'Connected to MCP server'
  });
});

transport.on('disconnection', (client) => {
  console.log('Client disconnected:', client.id);
});

await server.start(transport);
```

### STDIO Tool Integration

```typescript
import { STDIOTransport } from '@mcp-accelerator/transport-stdio';

const transport = new STDIOTransport();

// Add tools for CLI usage
server.addTool({
  name: 'file-search',
  description: 'Search files in directory',
  inputSchema: {
    type: 'object',
    properties: {
      pattern: { type: 'string' },
      directory: { type: 'string' }
    },
    required: ['pattern']
  }
}, async (input) => {
  const files = await searchFiles(input.pattern, input.directory);
  return {
    content: [{
      type: 'text',
      text: `Found ${files.length} files matching "${input.pattern}"`
    }]
  };
});

await server.start(transport);
```

## 🔄 Transport Switching

You can easily switch between transports without changing your application logic:

```typescript
// Same server, different transports
const httpTransport = new HTTPTransport({ port: 3000 });
const wsTransport = new WebSocketTransport({ port: 3001 });

// Start with HTTP
await server.start(httpTransport);

// Later switch to WebSocket
await server.stop();
await server.start(wsTransport);
```

## 🌐 Network Considerations

### HTTP Transport
- **Port**: Standard HTTP ports (80, 443, 8000, 3000)
- **Firewall**: Allow inbound HTTP/HTTPS traffic
- **Load Balancer**: Can be placed behind load balancers
- **CDN**: Compatible with CDN services

### WebSocket Transport
- **Port**: Any available port
- **Firewall**: Allow WebSocket connections
- **Proxy**: Requires WebSocket-aware proxies
- **Load Balancer**: Needs sticky sessions

### SSE Transport
- **Port**: Standard HTTP ports
- **Firewall**: Same as HTTP
- **Proxy**: Compatible with most HTTP proxies
- **Load Balancer**: Works with standard load balancers

### STDIO Transport
- **Port**: None (uses process streams)
- **Network**: No network requirements
- **Process**: Direct process communication

## 🔒 Security Considerations

### HTTP Transport
```typescript
const transport = new HTTPTransport({
  serverOptions: {
    https: {
      key: privateKey,
      cert: certificate,
      ca: caCertificate
    },
    trustProxy: true
  }
});
```

### WebSocket Transport
```typescript
const transport = new WebSocketTransport({
  verifyClient: (info) => {
    // Custom client verification
    return validateClient(info.origin);
  }
});
```

### Authentication
```typescript
// All transports support middleware
server.use(new JWTAuthMiddleware({
  secret: process.env.JWT_SECRET
}));

server.use(new RateLimitMiddleware({
  windowMs: 15 * 60 * 1000,
  max: 100
}));
```

## 📊 Performance Optimization

### HTTP Transport
- Enable HTTP/2
- Use connection pooling
- Configure appropriate timeouts
- Enable compression

### WebSocket Transport
- Implement connection pooling
- Use ping/pong for health checks
- Configure appropriate buffer sizes
- Handle backpressure

### SSE Transport
- Configure keep-alive intervals
- Implement proper reconnection logic
- Use appropriate event types
- Handle connection limits

## 🐛 Debugging and Monitoring

### Enable Debug Logging
```typescript
const transport = new HTTPTransport({
  serverOptions: {
    logger: {
      level: 'debug'
    }
  }
});
```

### Monitor Connections
```typescript
transport.on('connection', (client) => {
  console.log('New connection:', {
    id: client.id,
    remoteAddress: client.remoteAddress,
    userAgent: client.userAgent
  });
});
```

### Health Checks
```typescript
// HTTP transport provides built-in health endpoint
// GET /health

// Custom health check
server.addTool({
  name: 'health',
  description: 'Server health check',
  inputSchema: { type: 'object' }
}, async () => ({
  content: [{
    type: 'text',
    text: 'Server is healthy'
  }]
}));
```

## 🔧 Advanced Configuration

### Custom Message Routing
```typescript
transport.on('message', (client, message) => {
  // Custom message handling
  if (message.type === 'custom') {
    handleCustomMessage(client, message);
  }
});
```

### Connection Middleware
```typescript
transport.use((client, next) => {
  // Custom connection middleware
  client.metadata = extractMetadata(client);
  next();
});
```

### Error Handling
```typescript
transport.on('error', (error) => {
  console.error('Transport error:', error);
});

transport.on('clientError', (client, error) => {
  console.error(`Client ${client.id} error:`, error);
});
```

---

*Ready to implement your transport layer? Check out the [Examples](../examples/) for complete implementations.*
