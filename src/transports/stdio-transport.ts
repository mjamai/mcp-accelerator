import { MCPMessage } from '../types';
import { BaseTransport } from './base-transport';
import * as readline from 'readline';

/**
 * STDIO transport for command-line communication
 */
export class StdioTransport extends BaseTransport {
  public readonly name = 'stdio';
  private readonly clientId = 'stdio-client';
  private rl?: readline.Interface;

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
        const message: MCPMessage = JSON.parse(line);
        await this.emitMessage(this.clientId, message);
      } catch (error) {
        console.error('Failed to parse STDIO message:', error);
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
   * Send message to client
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('STDIO transport is not started');
    }

    if (clientId !== this.clientId) {
      throw new Error(`Unknown client ID: ${clientId}`);
    }

    // Write message to stdout
    process.stdout.write(JSON.stringify(message) + '\n');
  }

  /**
   * Broadcast message (same as send for STDIO)
   */
  async broadcast(message: MCPMessage): Promise<void> {
    await this.send(this.clientId, message);
  }
}

