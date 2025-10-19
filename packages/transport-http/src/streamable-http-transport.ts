import { createServer, IncomingMessage, Server, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';

import {
  BaseTransport,
  MCPMessage,
  createMCPError,
  MCPErrorCode,
} from '@mcp-accelerator/core';

export interface StreamableHttpTransportOptions {
  host?: string;
  port?: number;
  idleTimeoutMs?: number;
  maxBodySize?: number;
  enableSseNotifications?: boolean;
  onSessionEvent?: (event: StreamableSessionEvent) => void;
}

export type StreamableSessionEvent =
  | { type: 'created'; sessionId: string; clientId: string }
  | { type: 'closed'; sessionId: string; clientId: string; reason?: string }
  | { type: 'error'; sessionId?: string; clientId?: string; error: Error };

type WritableResponse = ServerResponse<IncomingMessage> & { req: IncomingMessage };

interface StreamSession {
  clientId: string;
  sessionId: string;
  request: IncomingMessage;
  response: WritableResponse;
  metadata: Record<string, unknown>;
  buffer: string;
  bytesReceived: number;
  idleTimer?: NodeJS.Timeout;
  isClosed: boolean;
}

const DEFAULT_OPTIONS: Required<
  Pick<
    StreamableHttpTransportOptions,
    'host' | 'port' | 'idleTimeoutMs' | 'maxBodySize' | 'enableSseNotifications'
  >
> = {
  host: '127.0.0.1',
  port: 3000,
  idleTimeoutMs: 120_000,
  maxBodySize: 0,
  enableSseNotifications: false,
};

export class StreamableHttpTransport extends BaseTransport {
  public readonly name = 'http-streamable';

  private readonly options: StreamableHttpTransportOptions & typeof DEFAULT_OPTIONS;
  private server: Server | null = null;
  private sessions = new Map<string, StreamSession>();
  private sessionsByClient = new Map<string, StreamSession>();

  constructor(options: StreamableHttpTransportOptions = {}) {
    super();
    this.options = {
      ...DEFAULT_OPTIONS,
      ...options,
    };
  }

  async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    this.server = createServer((req, res) => {
      if (req.method === 'OPTIONS') {
        this.handlePreflight(req, res as WritableResponse);
        return;
      }

      if (req.method === 'POST' && req.url === '/mcp/stream') {
        this.handleStreamRequest(req, res);
        return;
      }

      res.statusCode = 404;
      res.end();
    });

    await new Promise<void>((resolve, reject) => {
      this.server?.once('error', reject);
      this.server?.listen(this.options.port, this.options.host, () => resolve());
    });

    this.isStarted = true;
  }

  async stop(): Promise<void> {
    if (!this.isStarted || !this.server) {
      return;
    }

    const pending = Array.from(this.sessions.keys()).map((sessionId) =>
      this.closeSession(sessionId, 'transport shutting down'),
    );
    await Promise.allSettled(pending);

    await new Promise<void>((resolve, reject) => {
      this.server?.close((error) => (error ? reject(error) : resolve()));
    });

    this.server = null;
    this.isStarted = false;
  }

  async send(clientId: string, message: MCPMessage): Promise<void> {
    const session = this.sessionsByClient.get(clientId);
    if (!session || session.isClosed) {
      throw new Error(`Stream session not found for client: ${clientId}`);
    }

    const payload = `${JSON.stringify(message)}\n`;
    await this.safeWrite(session, payload);
  }

  async broadcast(): Promise<void> {
    throw new Error('Broadcast is not supported for Streamable HTTP transport');
  }

  getClientMetadata(clientId: string): Record<string, unknown> {
    return this.sessionsByClient.get(clientId)?.metadata ?? {};
  }

  // ---------------------------------------------
  // Internal helpers
  // ---------------------------------------------

  private handlePreflight(_req: IncomingMessage, res: WritableResponse): void {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-client-id, mcp-session-id, authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.end();
  }

  private handleStreamRequest(req: IncomingMessage, res: WritableResponse): void {
    if (!this.server) {
      res.statusCode = 503;
      res.end();
      return;
    }

    const sessionId = this.extractHeader(req, 'mcp-session-id') ?? randomUUID();
    const clientId = this.extractHeader(req, 'x-client-id') ?? sessionId;

    if (this.sessions.has(sessionId)) {
      res.statusCode = 409;
      res.end(
        `${JSON.stringify({
          type: 'error',
          error: createMCPError(
            MCPErrorCode.INVALID_REQUEST,
            'Session already exists',
            { sessionId },
          ),
        })}\n`,
      );
      return;
    }

    this.prepareResponse(req, res);

    const metadata = this.buildMetadata(req, sessionId);

    const session: StreamSession = {
      clientId,
      sessionId,
      request: req,
      response: res,
      metadata,
      buffer: '',
      bytesReceived: 0,
      isClosed: false,
    };

    this.sessions.set(sessionId, session);
    this.sessionsByClient.set(clientId, session);
    this.options.onSessionEvent?.({ type: 'created', sessionId, clientId });

    this.emitConnect(clientId).catch((error) => {
      this.options.onSessionEvent?.({ type: 'error', sessionId, clientId, error });
      void this.closeSession(sessionId, 'connect handler failed');
    });

    this.setupIdleTimeout(session);
    this.setupRequestListeners(session);
  }

  private extractHeader(req: IncomingMessage, name: string): string | undefined {
    const value = req.headers[name.toLowerCase()];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }

  private buildMetadata(req: IncomingMessage, sessionId: string): Record<string, unknown> {
    const metadata: Record<string, unknown> = {
      sessionId,
      ip: req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    for (const [key, value] of Object.entries(req.headers)) {
      if (key.startsWith('x-') || key === 'authorization') {
        metadata[key] = Array.isArray(value) ? value.join(',') : value ?? null;
      }
    }

    return metadata;
  }

  private prepareResponse(req: IncomingMessage, res: WritableResponse): void {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin ?? '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type, x-client-id, mcp-session-id, authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Content-Type', 'application/jsonl; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
  }

  private setupRequestListeners(session: StreamSession): void {
    const { request } = session;

    request.setEncoding('utf8');
    request.on('data', (chunk) => this.handleIncomingChunk(session, chunk));
    request.on('end', () => {
      void this.closeSession(session.sessionId, 'client ended stream');
    });
    request.on('close', () => {
      void this.closeSession(session.sessionId, 'client closed connection');
    });
    request.on('error', (error) => {
      this.options.onSessionEvent?.({
        type: 'error',
        sessionId: session.sessionId,
        clientId: session.clientId,
        error,
      });
      void this.closeSession(session.sessionId, 'stream error');
    });
  }

  private handleIncomingChunk(session: StreamSession, chunk: string): void {
    if (session.isClosed) {
      return;
    }

    this.resetIdleTimeout(session);

    if (this.options.maxBodySize > 0) {
      session.bytesReceived += Buffer.byteLength(chunk, 'utf8');
      if (session.bytesReceived > this.options.maxBodySize) {
        void this.writeError(
          session,
          createMCPError(
            MCPErrorCode.INVALID_REQUEST,
            'Payload too large',
            { limit: this.options.maxBodySize },
          ),
        );
        void this.closeSession(session.sessionId, 'payload too large');
        return;
      }
    }

    session.buffer += chunk;
    const lines = session.buffer.split('\n');
    session.buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      let message: MCPMessage;
      try {
        message = JSON.parse(line) as MCPMessage;
      } catch {
        void this.writeError(
          session,
          createMCPError(MCPErrorCode.INVALID_REQUEST, 'Invalid JSON payload'),
        );
        continue;
      }

      this.emitMessage(session.clientId, message).catch((error) => {
        this.options.onSessionEvent?.({
          type: 'error',
          sessionId: session.sessionId,
          clientId: session.clientId,
          error,
        });
        void this.writeError(
          session,
          createMCPError(
            MCPErrorCode.INTERNAL_ERROR,
            error instanceof Error ? error.message : 'Unhandled error',
          ),
          message,
        );
      });
    }
  }

  private async writeError(
    session: StreamSession,
    error: ReturnType<typeof createMCPError>,
    originalMessage?: MCPMessage,
  ): Promise<void> {
    if (session.isClosed) return;

    const messageId =
      originalMessage && typeof originalMessage === 'object' && originalMessage !== null && 'id' in originalMessage
        ? (originalMessage as { id?: unknown }).id ?? null
        : null;

    const payload = {
      type: 'error',
      id: messageId,
      error,
    };

    await this.safeWrite(session, `${JSON.stringify(payload)}\n`);
  }

  private async safeWrite(session: StreamSession, payload: string): Promise<void> {
    if (session.isClosed) return;

    await new Promise<void>((resolve, reject) => {
      const writable = session.response;

      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };

      const cleanup = () => {
        writable.off('error', onError);
      };

      writable.once('error', onError);
      writable.write(payload, (error) => {
        cleanup();
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async closeSession(sessionId: string, reason?: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || session.isClosed) {
      return;
    }

    session.isClosed = true;
    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
    }

    this.sessions.delete(sessionId);
    this.sessionsByClient.delete(session.clientId);

    try {
      if (!session.response.writableEnded) {
        session.response.end();
      }
    } catch {
      // ignore
    }

    this.emitDisconnect(session.clientId).catch(() => undefined);
    this.options.onSessionEvent?.({ type: 'closed', sessionId, clientId: session.clientId, reason });
  }

  private setupIdleTimeout(session: StreamSession): void {
    if (this.options.idleTimeoutMs <= 0) {
      return;
    }

    session.idleTimer = setTimeout(() => {
      void this.closeSession(session.sessionId, 'idle timeout');
    }, this.options.idleTimeoutMs);
    session.idleTimer.unref?.();
  }

  private resetIdleTimeout(session: StreamSession): void {
    if (!session.idleTimer || this.options.idleTimeoutMs <= 0) {
      return;
    }

    clearTimeout(session.idleTimer);
    session.idleTimer = setTimeout(() => {
      void this.closeSession(session.sessionId, 'idle timeout');
    }, this.options.idleTimeoutMs);
    session.idleTimer.unref?.();
  }
}
