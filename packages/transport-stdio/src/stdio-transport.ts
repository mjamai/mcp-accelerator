import { BaseTransport, MCPMessage } from '@mcp-accelerator/core';
import * as readline from 'readline';

/**
 * STDIO transport for command-line communication
 * Implements MCP STDIO transport specification
 */
export class StdioTransport extends BaseTransport {
  public readonly name = 'stdio';
  private readonly clientId = 'stdio-client';
  private rl?: readline.Interface;

  /**
   * Validate that a message line doesn't contain embedded newlines
   * as required by MCP STDIO specification
   */
  private validateMessageLine(line: string): void {
    if (line.includes('\n')) {
      throw new Error('Message contains embedded newlines (forbidden by MCP STDIO spec)');
    }
  }

  /**
   * Convert JSON-RPC message to MCP message format
   */
  private convertJsonRpcToMcp(jsonRpcMessage: any): MCPMessage {
    // Determine message type based on JSON-RPC structure
    if (jsonRpcMessage.method && jsonRpcMessage.id !== undefined) {
      // Request message
      return {
        type: 'request',
        id: jsonRpcMessage.id,
        method: jsonRpcMessage.method,
        params: jsonRpcMessage.params
      };
    } else if (jsonRpcMessage.result !== undefined && jsonRpcMessage.id !== undefined) {
      // Response message
      return {
        type: 'response',
        id: jsonRpcMessage.id,
        result: jsonRpcMessage.result
      };
    } else if (jsonRpcMessage.error && jsonRpcMessage.id !== undefined) {
      // Error message
      return {
        type: 'error',
        id: jsonRpcMessage.id,
        error: jsonRpcMessage.error
      };
    } else if (jsonRpcMessage.method && jsonRpcMessage.id === undefined) {
      // Notification (event)
      return {
        type: 'event',
        method: jsonRpcMessage.method,
        params: jsonRpcMessage.params
      };
    } else {
      throw new Error('Invalid JSON-RPC message format');
    }
  }

  /**
   * Convert MCP message to JSON-RPC format
   */
  private convertMcpToJsonRpc(mcpMessage: MCPMessage): any {
    switch (mcpMessage.type) {
      case 'request':
        return {
          jsonrpc: '2.0',
          method: mcpMessage.method,
          params: mcpMessage.params,
          id: mcpMessage.id
        };
      
      case 'response':
        return {
          jsonrpc: '2.0',
          result: mcpMessage.result,
          id: mcpMessage.id
        };
      
      case 'error':
        return {
          jsonrpc: '2.0',
          error: mcpMessage.error,
          id: mcpMessage.id
        };
      
      case 'event':
        return {
          jsonrpc: '2.0',
          method: mcpMessage.method,
          params: mcpMessage.params
        };
      
      default:
        throw new Error(`Unknown MCP message type: ${(mcpMessage as any).type}`);
    }
  }

  /**
   * Send JSON-RPC error response for parse errors with robust ID extraction
   */
  private async sendParseError(originalLine: string): Promise<void> {
    let errorSent = false;
    
    try {
      // Try to parse normally first
      const partialMessage = JSON.parse(originalLine);
      if (partialMessage.id) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: partialMessage.id,
          error: {
            code: -32700, // Parse error code from JSON-RPC spec
            message: 'Parse error'
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
        errorSent = true;
      }
    } catch {
      // If normal parsing fails, try to extract ID with regex
      const stringIdMatch = originalLine.match(/"id"\s*:\s*"([^"]+)"/);
      if (stringIdMatch) {
        const errorResponse = {
          jsonrpc: '2.0',
          id: stringIdMatch[1],
          error: {
            code: -32700,
            message: 'Parse error'
          }
        };
        process.stdout.write(JSON.stringify(errorResponse) + '\n');
        errorSent = true;
      } else {
        // Try numeric ID
        const numIdMatch = originalLine.match(/"id"\s*:\s*(\d+)/);
        if (numIdMatch) {
          const errorResponse = {
            jsonrpc: '2.0',
            id: parseInt(numIdMatch[1]),
            error: {
              code: -32700,
              message: 'Parse error'
            }
          };
          process.stdout.write(JSON.stringify(errorResponse) + '\n');
          errorSent = true;
        }
      }
    }
    
    // Log the attempt (only if we couldn't send an error response)
    if (!errorSent) {
      process.stderr.write('Unable to extract ID for JSON-RPC error response\n');
    }
  }

  /**
   * Start the STDIO transport
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('STDIO transport is already started');
    }

    // Create readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false,
    });

    // Handle incoming lines
    this.rl.on('line', async (line) => {
      try {
        // Validate message format per MCP STDIO spec
        this.validateMessageLine(line);
        
        const jsonRpcMessage = JSON.parse(line);
        
        // Convert JSON-RPC message to MCPMessage format
        const mcpMessage: MCPMessage = this.convertJsonRpcToMcp(jsonRpcMessage);
        
        await this.emitMessage(this.clientId, mcpMessage);
      } catch (error) {
        // Use stderr for logging as specified by MCP STDIO transport
        const errorMsg = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Failed to parse STDIO message: ${errorMsg}\n`);
        
        // Send JSON-RPC error response if possible
        await this.sendParseError(line);
      }
    });

    // Handle close
    this.rl.on('close', async () => {
      await this.emitDisconnect(this.clientId);
    });

    this.isStarted = true;
    await this.emitConnect(this.clientId);
  }

  /**
   * Stop the STDIO transport
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    if (this.rl) {
      this.rl.close();
      this.rl = undefined;
    }

    this.isStarted = false;
    await this.emitDisconnect(this.clientId);
  }

  /**
   * Send message to client (converts MCP message back to JSON-RPC)
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('STDIO transport is not started');
    }

    if (clientId !== this.clientId) {
      throw new Error(`Unknown client ID: ${clientId}`);
    }

    // Convert MCP message back to JSON-RPC format
    const jsonRpcMessage = this.convertMcpToJsonRpc(message);
    const messageStr = JSON.stringify(jsonRpcMessage);
    
    // Validate that serialized message doesn't contain embedded newlines
    // This ensures MCP STDIO compliance
    if (messageStr.includes('\n')) {
      throw new Error('Serialized message contains embedded newlines (forbidden by MCP STDIO spec)');
    }

    // Write message to stdout as required by MCP STDIO transport
    process.stdout.write(messageStr + '\n');
  }

  /**
   * Broadcast message (same as send for STDIO)
   */
  async broadcast(message: MCPMessage): Promise<void> {
    await this.send(this.clientId, message);
  }
}

