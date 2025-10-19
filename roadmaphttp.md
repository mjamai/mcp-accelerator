# Roadmap – Streamable HTTP Transport

Objectif : livrer un transport **HTTP streamable** conforme au standard MCP (cf. [MCP Streamable HTTP Transport](https://modelcontextprotocol.io/docs/transports/streamable-http)) permettant la compatibilité avec MCP Inspector et autres clients officiels.

---

## Phase A – Analyse & Design

### A.1 Cartographie fonctionnelle
- Étudier la spec “Streamable HTTP” (structure des messages, JSON Lines, headers attendus, gestion duplex).
- Recenser les écarts avec `@mcp-accelerator/transport-http` actuel (POST synchrone).
- Valider les scénarios utilisateurs ciblés : MCP Inspector, clients web, déploiements cloud.

**Livrables :**
- Note de cadrage technique
- Tableau des exigences (handshake, streaming bidirectionnel, notifications)

### A.2 Architecture cible
- Choisir la structure du nouveau package (`@mcp-accelerator/transport-http-streamable` ou refactor interne).
- Décider framework/stack (Fastify “raw” vs. node `http` natif pour contrôle complet).
- Définir API TypeScript (options, événements, métadonnées).

**Livrables :**
- Diagramme séquence request/response streamable
- Interface TS du transport (constructeur, `start`, `stop`, `send`)

---

## Phase B – Implémentation transport streamable

### B.1 Pipeline serveur
- Implémenter endpoint unique `POST /mcp/stream`.
- Supporter `Transfer-Encoding: chunked` et `Content-Type: application/jsonl` pour les réponses streamées.
- Gérer les sessions (`Mcp-Session-Id`), stockage socket, nettoyage (close/timeout).
- Optionnel : exposer un `GET /mcp/stream` SSE (`Content-Type: text/event-stream`) pour notifications unidirectionnelles si le client l’exige.

### B.2 Flux entrant
- Parser flux entrant en JSON Lines.
- Valider chaque message (JSON-RPC + MCP).
- Rejouer vers `MCPServer.emitMessage`.

### B.3 Flux sortant
- Encapsuler réponses MCP en JSON Lines (suffixe `\n`).
- Si SSE activé, formater les paquets (`data: {...}\n\n`) avec les mêmes payloads JSON.
- Supporter notifications/mises à jour non sollicitées.
- Gérer write backpressure, erreurs réseau, reconnexion.

**Livrables :**
- Nouveau transport streamable compilable
- Gestion des métadonnées (headers -> `context.metadata`)

---

## Phase C – Tests & conformité

### C.1 Tests unitaires
- Mock de connexion stream (readable/writable) pour vérifier parsing/émission.
- Tests d’erreurs (JSON invalide, close prématurée, multiplexing) avec vérification des codes JSON-RPC/MCP (`ParseError`, `InvalidRequest`, etc.).

### C.2 Tests d’intégration
- Suite Jest contre un client streamable de référence.
- Tests handshake (`initialize`), `tools/list`, `tools/call`, notifications.
- Scénarios reconnection / plusieurs clients / backpressure.

### C.3 Validation spec
- Compatibilité MCP Inspector (manuelle + script automatisé).
- Mettre à jour la matrice MCP (séction “Streamable HTTP” -> vert).

---

## Phase D – DX & documentation

### D.1 Exemples & guides
- Ajouter un exemple `examples/http-streamable`.
- Documentation dans `docs/examples/http-streamable.md`.
- Guide de migration depuis l’ancien transport HTTP classique.

### D.2 Outils & CLI
- `mcp-accelerator create` : option pour générer un serveur streamable.
- `mcp-accelerator doctor` : détecter la présence du transport et vérifier la configuration.

### D.3 Communication
- Changelog, notes de version, article README.
- Mention explicite de la compatibilité MCP Inspector.

---

## Phase E – Validation finale

1. **CI** : pipeline exécutant unit + intégration + lint.
2. **Compatibilité multi-clients** : MCP Inspector, Postman (tests streaming), scripts internes.
3. **Documentation** : guides à jour, roadmap close-out, mention dans `ANALYSE_APPROFONDIE`.
4. **Go/No-Go** : revue technique + DX, décision release publique.

---

## Risques & points d’attention
- Gestion du streaming bidirectionnel avec Fastify (peut nécessiter fallback vers serveur HTTP natif).
- Backpressure/chunking sur gros messages (monitorer mémoire et `write()`).
- Support proxies/reverse proxies (header `Connection: Upgrade` non nécessaire mais attention à `Transfer-Encoding`, sessions).
- Tests automatiques : besoin d’un client streamable dans la CI (éventuellement via `undici` en mode `duplex: 'half'`).

---

## Prochaines actions immédiates
1. A.1 – Rédiger la note de cadrage streamable (inclure décisions sur `Mcp-Session-Id`, JSON Lines vs SSE, gestion headers).
2. A.2 – Définir l’interface TypeScript du transport (duplex, sessions, API notifications) et la structure du package.
3. Prototyper un endpoint streamable minimal (POC hors monorepo) pour valider connexion POST ouverte + écriture JSON Lines.
