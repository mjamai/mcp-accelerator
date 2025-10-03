/**
 * Types et interfaces centraux du framework MCP Accelerator
 */

import { z } from 'zod';

/**
 * Configuration du serveur MCP
 */
export interface ServerConfig {
  /** Nom du serveur */
  name: string;
  /** Version du serveur */
  version: string;
  /** Logger personnalisé (optionnel) */
  logger?: Logger;
  /** Options de transport */
  transport?: TransportConfig;
  /** Plugins à charger au démarrage */
  plugins?: Plugin[];
}

/**
 * Configuration du transport
 */
export interface TransportConfig {
  /** Type de transport */
  type: 'stdio' | 'http' | 'websocket' | 'sse';
  /** Port pour HTTP/WebSocket/SSE */
  port?: number;
  /** Hôte pour HTTP/WebSocket/SSE */
  host?: string;
  /** Options supplémentaires */
  options?: Record<string, unknown>;
}

/**
 * Interface de logger personnalisable
 */
export interface Logger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, error?: Error, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

/**
 * Définition d'un outil MCP avec validation Zod
 */
export interface Tool<I = unknown, O = unknown> {
  /** Nom unique de l'outil */
  name: string;
  /** Description de l'outil */
  description: string;
  /** Schéma de validation des entrées avec Zod */
  inputSchema: z.ZodType<I>;
  /** Handler métier asynchrone */
  handler: ToolHandler<I, O>;
  /** Métadonnées supplémentaires */
  metadata?: Record<string, unknown>;
}

/**
 * Handler d'un outil
 */
export type ToolHandler<I = unknown, O = unknown> = (
  input: I,
  context: ToolContext
) => Promise<O>;

/**
 * Contexte d'exécution d'un outil
 */
export interface ToolContext {
  /** ID du client qui a fait la requête */
  clientId: string;
  /** Métadonnées de la requête */
  metadata?: Record<string, unknown>;
  /** Logger pour cet outil */
  logger: Logger;
}

/**
 * Message MCP standard
 */
export interface MCPMessage {
  /** Type de message */
  type: 'request' | 'response' | 'error' | 'event';
  /** ID du message (pour corréler requête/réponse) */
  id?: string;
  /** Méthode ou événement */
  method?: string;
  /** Paramètres ou données */
  params?: unknown;
  /** Résultat (pour réponse) */
  result?: unknown;
  /** Erreur (pour erreur) */
  error?: MCPError;
}

/**
 * Erreur MCP standard
 */
export interface MCPError {
  /** Code d'erreur */
  code: number;
  /** Message d'erreur */
  message: string;
  /** Données supplémentaires */
  data?: unknown;
}

/**
 * Interface de transport abstrait
 */
export interface Transport {
  /** Nom du transport */
  name: string;
  /** Démarre le transport */
  start(): Promise<void>;
  /** Arrête le transport */
  stop(): Promise<void>;
  /** Envoie un message à un client */
  send(clientId: string, message: MCPMessage): Promise<void>;
  /** Broadcast un message à tous les clients */
  broadcast(message: MCPMessage): Promise<void>;
  /** Événement lors de la réception d'un message */
  onMessage(handler: MessageHandler): void;
  /** Événement lors de la connexion d'un client */
  onConnect(handler: ConnectHandler): void;
  /** Événement lors de la déconnexion d'un client */
  onDisconnect(handler: DisconnectHandler): void;
}

/**
 * Handler de message
 */
export type MessageHandler = (clientId: string, message: MCPMessage) => void | Promise<void>;

/**
 * Handler de connexion
 */
export type ConnectHandler = (clientId: string) => void | Promise<void>;

/**
 * Handler de déconnexion
 */
export type DisconnectHandler = (clientId: string) => void | Promise<void>;

/**
 * Plugin pour étendre le serveur
 */
export interface Plugin {
  /** Nom du plugin */
  name: string;
  /** Version du plugin */
  version: string;
  /** Priorité d'exécution (plus élevé = plus tôt) */
  priority?: number;
  /** Initialisation du plugin */
  initialize(server: MCPServerInterface): Promise<void> | void;
  /** Nettoyage lors de la désactivation */
  cleanup?(): Promise<void> | void;
}

/**
 * Interface du serveur MCP (pour plugins et extensions)
 */
export interface MCPServerInterface {
  /** Configuration du serveur */
  config: ServerConfig;
  /** Logger du serveur */
  logger: Logger;
  /** Enregistre un outil */
  registerTool<I = unknown, O = unknown>(tool: Tool<I, O>): void;
  /** Retire un outil */
  unregisterTool(name: string): void;
  /** Liste tous les outils */
  listTools(): Tool[];
  /** Enregistre un hook lifecycle */
  registerHook(hook: LifecycleHook): void;
  /** Enregistre un middleware */
  registerMiddleware(middleware: Middleware): void;
  /** Obtient le transport actuel */
  getTransport(): Transport | null;
  /** Change le transport */
  setTransport(transport: Transport): Promise<void>;
}

/**
 * Hook lifecycle
 */
export interface LifecycleHook {
  /** Nom du hook */
  name: string;
  /** Phase du lifecycle */
  phase: 'onStart' | 'onStop' | 'onClientConnect' | 'onClientDisconnect' | 'beforeToolExecution' | 'afterToolExecution';
  /** Handler du hook */
  handler: HookHandler;
}

/**
 * Handler de hook
 */
export type HookHandler = (context: HookContext) => void | Promise<void>;

/**
 * Contexte de hook
 */
export interface HookContext {
  /** Type d'événement */
  event: string;
  /** Données associées */
  data?: unknown;
  /** Client concerné (si applicable) */
  clientId?: string;
  /** Outil concerné (si applicable) */
  toolName?: string;
}

/**
 * Middleware pour traiter les messages
 */
export interface Middleware {
  /** Nom du middleware */
  name: string;
  /** Priorité d'exécution */
  priority?: number;
  /** Handler du middleware */
  handler: MiddlewareHandler;
}

/**
 * Handler de middleware
 */
export type MiddlewareHandler = (
  message: MCPMessage,
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Contexte de middleware
 */
export interface MiddlewareContext {
  /** ID du client */
  clientId: string;
  /** Logger */
  logger: Logger;
  /** Métadonnées */
  metadata?: Record<string, unknown>;
}

/**
 * Résultat d'exécution d'un outil
 */
export interface ToolExecutionResult<O = unknown> {
  /** Succès ou échec */
  success: boolean;
  /** Résultat (si succès) */
  result?: O;
  /** Erreur (si échec) */
  error?: MCPError;
  /** Durée d'exécution en ms */
  duration: number;
}

