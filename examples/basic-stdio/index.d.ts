/**
 * Enhanced Basic STDIO Example - MCP Compliant Echo Server
 *
 * This example demonstrates the enhanced MCP Accelerator Framework with:
 * - Automatic MCP protocol handling (initialize, tools/list, tools/call)
 * - 100% MCP STDIO specification compliance
 * - Type-safe tool registration with Zod validation
 * - Proper error handling and logging
 *
 * Installation:
 *   npm install @mcp-accelerator/core @mcp-accelerator/transport-stdio zod
 *
 * Usage:
 *   node index.js
 *
 * Test with:
 *   echo '{"type":"request","method":"initialize","params":{"protocolVersion":"2024-11-05","clientInfo":{"name":"test","version":"1.0.0"}},"id":"1"}' | node index.ts
 *   echo '{"type":"request","method":"tools/list","id":"2"}' | node index.ts
 *   echo '{"type":"request","method":"tools/call","params":{"name":"echo","arguments":{"message":"Hello MCP!"}},"id":"3"}' | node index.ts
 */
export {};
//# sourceMappingURL=index.d.ts.map