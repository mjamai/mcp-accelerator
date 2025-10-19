import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
/**
 * STDIO transport for command-line communication
 * Implements MCP STDIO transport specification
 */
export declare class StdioTransport extends BaseTransport {
    readonly name = "stdio";
    private readonly clientId;
    private rl?;
    /**
     * Validate that a message line doesn't contain embedded newlines
     * as required by MCP STDIO specification
     */
    private validateMessageLine;
    /**
     * Convert JSON-RPC message to MCP message format
     */
    private convertJsonRpcToMcp;
    /**
     * Convert MCP message to JSON-RPC format
     */
    private convertMcpToJsonRpc;
    /**
     * Send JSON-RPC error response for parse errors with robust ID extraction
     */
    private sendParseError;
    /**
     * Start the STDIO transport
     */
    start(): Promise<void>;
    /**
     * Stop the STDIO transport
     */
    stop(): Promise<void>;
    /**
     * Send message to client (converts MCP message back to JSON-RPC)
     */
    send(clientId: string, message: MCPMessage): Promise<void>;
    /**
     * Broadcast message (same as send for STDIO)
     */
    broadcast(message: MCPMessage): Promise<void>;
}
//# sourceMappingURL=stdio-transport.d.ts.map