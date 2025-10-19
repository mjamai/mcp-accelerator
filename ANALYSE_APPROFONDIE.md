# 🔍 Audit MCP Accelerator – État au JJ/MM/2024

Ce document dresse l’inventaire de MCraPid et identifie les écarts qui séparent le framework des exigences **Model Context Protocol** décrites sur <https://modelcontextprotocol.io/docs/getting-started/intro>. Il complète le plan d’action formalisé dans `ROADMAP.md`.

---

## 1. Résumé exécutif
- **Couverture partielle du protocole** : les méthodes `initialize`, `tools/list` et `tools/call` fonctionnent, mais la négociation de versions et la plupart des capacités (resources, prompts, events) restent incomplètes.
- **Annonces de capabilities trop optimistes** : le serveur expose `resources` et `prompts` dans le handshake tout en renvoyant encore `METHOD_NOT_FOUND`, ce qui est non conforme à MCP.
- **Écosystème extensible en chantier** : la gestion des plugins, des transports et du logging est amorcée, mais manque d’APIs de gouvernance, de contrôles de sécurité et de tests contractuels.
- **Documentation & DX à réaligner** : certaines sections (ex. anciens extraits d’`ANALYSE_APPROFONDIE.md`) décrivaient des features non implémentées ; la doc, la CLI et les exemples doivent être synchronisés avec l’état réel.

---

## 2. Inventaire de l’existant

```
packages/
├── core/
│   ├── src/core/             # Serveur, gestion des outils, erreurs, logger
│   ├── src/plugins/          # PluginManager (register/load/unload)
│   ├── src/transports/       # BaseTransport abstraite
│   ├── src/cli/              # CLI de scaffolding
│   └── src/__tests__/        # Tests d’intégration HTTP uniquement
├── transport-stdio/          # Transport MCP STDIO conforme au format lignes uniques
├── transport-http/           # Transport Fastify JSON-RPC over HTTP
├── transport-websocket/      # Transport WebSocket avec heartbeat/backpressure
├── transport-sse/ & transport-http/ etc.
└── middleware-*              # Middlewares additionnels (auth, cors, observability…)
```

---

## 3. Tableau de conformité (snapshot)

| Domaine | Exigence MCP | Implémentation actuelle | Constats |
| --- | --- | --- | --- |
| Handshake | `initialize` négocie `protocolVersion`, annonce capabilities disponibles | Vérifie seulement `['2024-11-05','2025-06-18']` codées en dur (`packages/core/src/core/server.ts:355`) et renvoie `resources/prompts` même sans support réel | Ajout d’un `ProtocolManager`, adaptateur capabilities dynamiques et compatibilité ascendante requis |
| Tools | `tools/list`, `tools/call` avec schéma JSON précis | Fonctionnel avec validation Zod (`packages/core/src/core/tool-manager.ts`) mais exporte un schéma minimal `{ type: 'object' }` (lignes 157-165) | Nécessite conversion JSON Schema complète + support `arguments` vs `input` homogène |
| Resources | `resources/list`, `resources/read` | Placeholder renvoyant liste vide et `METHOD_NOT_FOUND` (`packages/core/src/core/server.ts:463-485`) | Implémentation complète (inventaire, lecture, events) manquante |
| Prompts | `prompts/list`, `prompts/get` | Placeholder vide et `METHOD_NOT_FOUND` (`packages/core/src/core/server.ts:491-513`) | Gestion de templates, tags & interpolation à développer |
| Logging | `logging/setLevel` doit modifier le logger actif | Log message sans changer le niveau (`packages/core/src/core/server.ts:528-537`) ; `ConsoleLogger` n’expose pas de setter (`packages/core/src/core/logger.ts`) | Implémenter un logger dynamique ou wrapper configurable |
| Transport STDIO | Messages JSON-RPC 2.0 sur une ligne, stderr pour logs | Conforme (`packages/transport-stdio/src/stdio-transport.ts`) | OK, prévoir tests de round-trip |
| Transports réseau | Alignement sur MCP over HTTP/WebSocket | HTTP attend `tools/execute` (`packages/core/src/__tests__/integration/transport-integration.test.ts:38-90`) alors que le serveur n’a que `tools/call`; WebSocket transmet les messages bruts | Normaliser les méthodes et vérifier l’adhérence JSON-RPC 2.0 |
| Plugins | Installation, activation, sandbox, audit | `PluginManager` gère register/load/unload (`packages/core/src/plugins/plugin-manager.ts`) | Manque installation distante, activation, dépendances, hooks de sécurité |
| Tests | Unitaires + intégration + contract tests | Un seul jeu `transport-integration` pour HTTP | Étendre aux autres transports, au handshake et aux capabilities |
| Documentation | Cohérence avec code | Descriptions obsolètes supprimées | Maintenir ce rapport et `ROADMAP.md` comme source de vérité |

---

## 4. Constat détaillé & actions recommandées

### 4.1 Protocole & handshake
- **Constat** : la version de protocole est validée via un tableau statique (`packages/core/src/core/server.ts:355-358`). Aucun calcul des capacités par version, aucun fallback.
- **Action** : implémenter le `ProtocolManager` (négociation, compatibilité ascendante, mapping capabilities) et l’injecter depuis `MCPServer` avant de répondre à `initialize`.
- **Action** : n’annoncer dans `capabilities` que les domaines réellement supportés ; différer l’activation de `resources/prompts` tant que non implémentés.

### 4.2 Gestion des outils
- **Constat** : validation d’entrée via Zod et exécution centralisée (`packages/core/src/core/tool-manager.ts:28-118`). Toutefois, la conversion JSON Schema est incomplète (`packages/core/src/core/tool-manager.ts:157-165`).
- **Action** : adopter `zod-to-json-schema` (ou équivalent) pour produire des schémas exploitables par les clients MCP et enrichir `metadata` (`examples`).
- **Action** : harmoniser la structure d’appel (`arguments` vs `input`) et ajouter des tests contractuels pour les erreurs Zod.

### 4.3 Capabilities Resources & Prompts
- **Constat** : endpoints placeholders renvoyant des erreurs (`packages/core/src/core/server.ts:463-513`).
- **Action** : définir un modèle interne (catalogue de ressources avec URIs, MIME types, provenance, ACL) et implémenter `resources/list`/`read` avec tests.
- **Action** : modéliser les prompts (titres, rôles, placeholders) et implémenter `prompts/list`/`get`, y compris la validation des variables.
- **Action** : ajouter un mécanisme d’événements (`resources/updated` et autres notifications), si nécessaire.

### 4.4 Logging & observabilité
- **Constat** : `logging/setLevel` n’a pas d’effet réel (`packages/core/src/core/server.ts:528-537`) et `ConsoleLogger` ne permet pas de changer de niveau (`packages/core/src/core/logger.ts`).
- **Action** : exposer un setter de niveau, ou router vers un logger configurable (p. ex. `pino`, `winston`) avec mapping MCP -> niveaux internes.
- **Action** : standardiser les identifiants de requêtes et enrichir la télémétrie (temps de traitement déjà mesuré mais peu exploité).

### 4.5 Plugins & extensions
- **Constat** : `PluginManager` propose `register/load/unload` (`packages/core/src/plugins/plugin-manager.ts`) sans installation, activation, ni priorisation avancée.
- **Action** : ajouter les cycles `install/activate/deactivate` décrits dans l’ancienne documentation et fournir une API/CLI pour gérer les plugins à chaud.
- **Action** : intégrer des politiques de sécurité (contrôles de signature, sandbox, audit log) avant de déclarer le framework prêt pour un écosystème externe.

### 4.6 Transports réseau
- **HTTP** : la suite de tests invoque `tools/execute` (`packages/core/src/__tests__/integration/transport-integration.test.ts:38-90`) alors que le serveur implémente `tools/call`, créant un écart vis-à-vis de MCP. L’API retourne un objet `result.output`, pas le format `content[]` standard MCP.
- **WebSocket/SSE** : transmettent des messages MCP génériques mais sans validation JSON-RPC approfondie (`packages/transport-websocket/src/websocket-transport.ts`).
- **Actions** :
  - Harmoniser toutes les routes sur les méthodes MCP officielles (`tools/list`, `tools/call`, etc.).
  - Mettre en place des tests inter-transport pour garantir un comportement identique (demande, réponse, erreurs).
  - Ajouter des contrôles d’authentification et de quotas (actuellement optionnels).

### 4.7 Tests & qualité
- **Constat** : seuls les tests d’intégration HTTP sont présents (`packages/core/src/__tests__/integration/transport-integration.test.ts`). Pas de tests unitaires pour `ToolManager`, `ErrorHandler`, `ProtocolManager` (non implémenté), ni de contract tests pour les transports.
- **Action** : étendre la couverture de tests :
  - Unitaires pour chaque composant clé (tool manager, protocol manager, logger).
  - Tests d’intégration pour STDIO, WebSocket, SSE.
  - Contract tests (Pact, Playwright, etc.) pour vérifier la conformité MCP face à des clients de référence.

### 4.8 Documentation & expérience développeur
- **Constat** : l’ancienne analyse décrivait des fonctionnalités non livrées. La documentation principale (`README.md`, `docs/`) liste des capabilities en cours sans préciser le statut.
- **Action** : maintenir `ANALYSE_APPROFONDIE.md` (ce document) et `ROADMAP.md` comme base vivante ; ajouter une matrice de conformité visible dans `README.md`.
- **Action** : enrichir la CLI (`packages/core/src/cli`) pour générer des providers de ressources/prompts et inclure des exemples alignés sur la spec.

### 4.9 Sécurité & observabilité
- **Constat** : présence de middlewares (auth, rate-limit, observability) mais absence d’intégration par défaut dans `MCPServer`. Pas de recommandations explicites dans `SECURITY.md`.
- **Action** : proposer une configuration sécurisée par défaut (auth obligatoire sur HTTP/WebSocket, audit log activé) et documenter le processus de vulnérabilité.

---

## 5. Priorités immédiates
1. Intégrer et tester le futur `ProtocolManager`, puis n’exposer que les capabilities effectivement supportées.
2. Implémenter `resources/*` et `prompts/*` ou les retirer temporairement du handshake pour rester conforme.
3. Harmoniser le format des réponses/outils entre le serveur et les transports, en particulier la méthode `tools/call`.
4. Élargir la couverture de tests et documenter la matrice de conformité dans `README.md`.
5. Aligner la documentation développeur et la CLI sur l’état réel avant de publier une nouvelle release.

Ces actions sont corrélées aux phases décrites dans `ROADMAP.md` et constituent la feuille de route pour transformer MCraPid en véritable **MCP Accelerator** conforme.
