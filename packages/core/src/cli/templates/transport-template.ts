/**
 * Template generators for creating custom transports
 */

export interface TransportTemplateOptions {
  name: string;
}

export function generateTransportFile(options: TransportTemplateOptions): string {
  const className = options.name.charAt(0).toUpperCase() + options.name.slice(1) + 'Transport';
  
  return `import { MCPMessage } from 'mcp-accelerator';
import { BaseTransport } from 'mcp-accelerator';

/**
 * Custom ${options.name} transport implementation
 */
export class ${className} extends BaseTransport {
  public readonly name = '${options.name}';
  
  private clients: Map<string, any> = new Map();

  /**
   * Start the transport
   */
  async start(): Promise<void> {
    if (this.isStarted) {
      throw new Error('${className} is already started');
    }

    // TODO: Initialize your transport here
    // Example: Start server, open connections, etc.
    
    console.log('${className} started');
    this.isStarted = true;
  }

  /**
   * Stop the transport
   */
  async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    // TODO: Cleanup resources
    // Example: Close server, disconnect clients, etc.
    
    this.clients.clear();
    this.isStarted = false;
    console.log('${className} stopped');
  }

  /**
   * Send message to a specific client
   */
  async send(clientId: string, message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('${className} is not started');
    }

    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(\`Client not found: \${clientId}\`);
    }

    // TODO: Implement sending logic
    // Example: client.send(JSON.stringify(message));
  }

  /**
   * Broadcast message to all clients
   */
  async broadcast(message: MCPMessage): Promise<void> {
    if (!this.isStarted) {
      throw new Error('${className} is not started');
    }

    // TODO: Implement broadcast logic
    for (const [clientId, client] of this.clients.entries()) {
      await this.send(clientId, message);
    }
  }

  /**
   * Handle incoming client connection
   */
  private async handleConnection(client: any, clientId: string): Promise<void> {
    this.clients.set(clientId, client);
    await this.emitConnect(clientId);

    // TODO: Setup message handlers
    // Example:
    // client.on('message', async (data) => {
    //   const message = JSON.parse(data);
    //   await this.emitMessage(clientId, message);
    // });

    // client.on('close', async () => {
    //   this.clients.delete(clientId);
    //   await this.emitDisconnect(clientId);
    // });
  }
}
`;
}

export function generateTransportTest(options: TransportTemplateOptions): string {
  const className = options.name.charAt(0).toUpperCase() + options.name.slice(1) + 'Transport';
  
  return `import { ${className} } from '../${options.name}-transport';

describe('${className}', () => {
  let transport: ${className};

  beforeEach(() => {
    transport = new ${className}();
  });

  afterEach(async () => {
    if (transport.getIsStarted()) {
      await transport.stop();
    }
  });

  it('should have correct name', () => {
    expect(transport.name).toBe('${options.name}');
  });

  it('should start successfully', async () => {
    await transport.start();
    expect(transport.getIsStarted()).toBe(true);
  });

  it('should stop successfully', async () => {
    await transport.start();
    await transport.stop();
    expect(transport.getIsStarted()).toBe(false);
  });

  it('should throw error when starting twice', async () => {
    await transport.start();
    await expect(transport.start()).rejects.toThrow();
  });

  // Add more tests as needed
});
`;
}

