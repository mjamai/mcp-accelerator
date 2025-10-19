/**
 * Tests de conformité MCP pour le transport STDIO
 */

import { StdioTransport } from '../stdio-transport';
import { MCPMessage } from '@mcp-accelerator/core';

describe('StdioTransport MCP Compliance', () => {
  let transport: StdioTransport;

  beforeEach(() => {
    transport = new StdioTransport();
  });

  describe('Message validation', () => {
    test('should reject messages with embedded newlines in input', async () => {
      const mockStderr = jest.spyOn(process.stderr, 'write').mockImplementation();
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation();

      await transport.start();

      // Simulate receiving a message with embedded newline
      const messageWithNewline = '{"type": "request", "method": "test\\nembedded"}';
      
      // This should trigger validation error
      const rl = (transport as any).rl;
      rl.emit('line', messageWithNewline);

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringContaining('Message contains embedded newlines')
      );

      mockStderr.mockRestore();
      mockStdout.mockRestore();
      await transport.stop();
    });

    test('should reject outgoing messages with embedded newlines', async () => {
      await transport.start();

      const messageWithNewline: MCPMessage = {
        type: 'response',
        id: 'test',
        result: { data: 'test\nwith\nnewlines' }
      };

      await expect(
        transport.send('stdio-client', messageWithNewline)
      ).rejects.toThrow('Serialized message contains embedded newlines');

      await transport.stop();
    });
  });

  describe('Error handling', () => {
    test('should send JSON-RPC error for parse errors with ID', async () => {
      const mockStderr = jest.spyOn(process.stderr, 'write').mockImplementation();
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation();

      await transport.start();

      // Simulate malformed JSON with ID
      const malformedMessage = '{"id": "123", "type": "request", invalid}';
      
      const rl = (transport as any).rl;
      rl.emit('line', malformedMessage);

      // Should log error to stderr
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse STDIO message')
      );

      // Should send JSON-RPC error response to stdout
      expect(mockStdout).toHaveBeenCalledWith(
        expect.stringContaining('"error":{"code":-32700,"message":"Parse error"}')
      );

      mockStderr.mockRestore();
      mockStdout.mockRestore();
      await transport.stop();
    });

    test('should only log to stderr for parse errors without ID', async () => {
      const mockStderr = jest.spyOn(process.stderr, 'write').mockImplementation();
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation();

      await transport.start();

      // Simulate malformed JSON without ID
      const malformedMessage = '{"type": "request", invalid}';
      
      const rl = (transport as any).rl;
      rl.emit('line', malformedMessage);

      // Should log error to stderr
      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse STDIO message')
      );

      // Should not send error response (no ID to respond to)
      expect(mockStdout).not.toHaveBeenCalledWith(
        expect.stringContaining('"error"')
      );

      mockStderr.mockRestore();
      mockStdout.mockRestore();
      await transport.stop();
    });
  });

  describe('MCP STDIO specification compliance', () => {
    test('should use stdout only for MCP messages', async () => {
      const mockStdout = jest.spyOn(process.stdout, 'write').mockImplementation();

      await transport.start();

      const validMessage: MCPMessage = {
        type: 'response',
        id: 'test',
        result: { success: true }
      };

      await transport.send('stdio-client', validMessage);

      // Should write to stdout with newline delimiter
      expect(mockStdout).toHaveBeenCalledWith(
        JSON.stringify(validMessage) + '\n'
      );

      mockStdout.mockRestore();
      await transport.stop();
    });

    test('should use stderr for logging', async () => {
      const mockStderr = jest.spyOn(process.stderr, 'write').mockImplementation();

      await transport.start();

      // Trigger a parse error to test stderr usage
      const rl = (transport as any).rl;
      rl.emit('line', 'invalid json');

      expect(mockStderr).toHaveBeenCalledWith(
        expect.stringContaining('Failed to parse STDIO message')
      );

      mockStderr.mockRestore();
      await transport.stop();
    });
  });
});
