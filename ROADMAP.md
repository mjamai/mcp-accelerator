# MCP Accelerator Roadmap

Feuille de route granularisée construite à partir de l’audit (`ANALYSE_APPROFONDIE.md`) pour transformer MCraPid en véritable **MCP Accelerator** conforme à la [spec MCP](https://modelcontextprotocol.io/docs/getting-started/intro).

---

## Principes de pilotage
- **Clarté** : chaque étape comporte des livrables concrets et des critères de validation.
- **Séquentialité contrôlée** : on ne passe à l’étape suivante qu’après validation des tests et de la documentation.
- **Conformité observable** : la matrice MCP est mise à jour à la fin de chaque étape.
- **DX & sécurité par défaut** : chaque livraison doit préserver l’expérience développeur et renforcer la posture sécurité.

---

## Phase 0 – Assainissement & preuve de conformité
- **Étape 0.1 – Cartographie factuelle**
  - Synchroniser `README.md`, `ANALYSE_APPROFONDIE.md` et la matrice de conformité.
  - Lister les méthodes MCP réellement opérationnelles (`initialize`, `tools/*`, etc.).
  - Sortir un tableau “Implémenté / Partiel / Manquant” et l’ajouter à la doc principale.
- **Étape 0.2 – Plan de tests de référence**
  - Définir pour chaque capability les tests unitaires, intégration et contract nécessaires.
  - Configurer les scripts npm correspondants (`test:unit`, `test:integration`, `test:contracts`).
  - Ajout de placeholders de suites de tests et intégration dans la CI.
- **Validation Phase 0**
  - Revue de la matrice MCP publiée.
  - Pipeline CI verte sur les suites existantes.
  - Documentation d’état communiquée à l’équipe.

## Phase 1 – Handshake protocolaire irréprochable
- **Étape 1.1 – Implémenter `ProtocolManager`**
  - Créer `packages/core/src/core/protocol-manager.ts` avec négociation, fallback, strict mode.
  - Définir les capabilities par version (2024-11-05, 2025-06-18, etc.).
  - Couvrir par des tests unitaires (cas strict, backward, version inconnue).
- **Étape 1.2 – Intégrer la négociation dans `MCPServer`**
  - Brancher `ProtocolManager` dans `handleInitialize`.
  - Ajuster `serverCapabilities` pour n’annoncer que les features actives.
  - Étendre les tests d’intégration `initialize` (versions supportées/refusées).
- **Étape 1.3 – Conformité JSON-RPC & logging**
  - Refactor `ToolManager.getToolsMetadata` pour produire un JSON Schema complet (`zod-to-json-schema`).
  - Rendre `ConsoleLogger` ou un wrapper capable de changer de niveau suite à `logging/setLevel`.
  - Ajouter tests pour `logging/setLevel` et validation JSON-RPC (id, type, erreurs).
- **Validation Phase 1**
  - Tous les tests Phase 1 exécutés en CI.
  - Documentation (README, EXECUTIVE_SUMMARY) mise à jour avec la négociation.
  - Matrice MCP : volet Handshake passé en “Vert”.

## Phase 2 – Capacités MCP (Resources & Prompts)
- **Étape 2.1 – Modèle et inventaire des resources**
  - Concevoir le modèle (URI, mime type, provider, auth, timestamps).
  - Implémenter `resources/list` avec catalogues (ex. filesystem) et tests unitaires.
  - Implémenter `resources/read` avec validation d’accès et tests d’intégration.
- **Étape 2.2 – Prompts typés**
  - Définir le format des prompts (id, titre, rôle, tags, placeholders, version).
  - Implémenter `prompts/list`/`prompts/get` avec validation des paramètres.
  - Ajouter exemples dans `examples/` et tests d’intégration couvrant placeholders.
- **Étape 2.3 – Notifications & synchro**
  - Ajouter événements `resources/updated` / `prompts/updated` le cas échéant.
  - Tester la diffusion sur STDIO + un transport réseau.
  - Mettre à jour la documentation d’usage et la matrice MCP.
- **Validation Phase 2**
  - ✅ Capabilities `resources` et `prompts` désormais annoncées uniquement après tests verts (tests unitaires + intégration).
  - ⚠️ Scénarios E2E (client MCP de référence) à automatiser.
  - ✅ Guides utilisateurs ajoutés dans `docs/`.

## Phase 3 – Extensibilité, transports & gouvernance
- **Étape 3.1 – Plugin lifecycle complet**
  - Étendre `PluginManager` avec `install`, `activate`, `deactivate`, dépendances.
  - Introduire audit log et contrôle d’intégrité (signature ou checksum).
  - Fournir API/CLI de gestion (`mcp-accelerator plugins ...`) et tests.
- **Étape 3.2 – Parité transport STDIO/HTTP/WebSocket/SSE**
  - ✅ Harmoniser la méthode `tools/call` et la structure des réponses (content[]).
  - ⚠️ Ajouter tests d’intégration croisés pour chaque transport (présents mais sautés en sandbox restreint).
  - ✅ Activer authentification optionnelle, quotas et métriques dans les transports réseau.
- **Étape 3.3 – Observabilité & sécurité**
  - ✅ Intégrer les middlewares (auth, rate-limit, observability) dans une config par défaut (`applyDefaultSecurity`).
  - ✅ Documentation des endpoints / métriques consolidée (cartes health + Prometheus + tracing).
  - ✅ `SECURITY.md` et `NOTICE` mis à jour avec les nouvelles recommandations.
- **Validation Phase 3**
  - CI matrix exécutant les tests sur tous les transports.
  - Documentation plugin & transports à jour, exemples revus.
  - Matrice MCP : sections Transports & Extensibilité au vert.

## Phase 4 – Expérience développeur & industrialisation
- **Étape 4.1 – CLI & scaffolding avancés**
  - Étendre la CLI pour générer tools/resources/prompts/providers/tests.
  - Ajouter un `mcp-accelerator doctor` vérifiant la conformité d’un projet.
  - Couvrir la CLI par des tests (snapshots ou e2e).
- **Étape 4.2 – Documentation consolidée**
  - Fusionner guides dans `docs/` (déploiement, sécurité, observabilité).
  - Ajouter tutoriels pas-à-pas et diagrammes d’architecture.
  - Mettre en place versionnement de la doc si nécessaire.
- **Étape 4.3 – Release management & qualité continue**
  - Automatiser changelog, versioning semver, publication npm.
  - Intégrer scans sécurité (`npm audit`, `snyk`) et suivi des licences.
  - Collecter feedback développeurs (DX interviews ou sondages) et itérer.
- **Validation Phase 4**
  - Pipeline CI complète (lint, tests, audit, release) verte.
  - Score sécurité sans vulnérabilité haute.
  - Satisfaction DX documentée et actions de suivi planifiées.

---

## Gouvernance & suivi continu
- Revue bi-hebdomadaire du roadmap + mise à jour de la matrice MCP.
- Tableau de bord KPIs : couverture de tests, temps moyen de génération projet, incidents sécurité.
- Risques principaux suivis : divergence doc/code, dette sur schémas JSON, posture sécurité transport HTTP.
- À chaque fin de phase : post-mortem, ajustement du backlog et communication aux contributeurs.

---

## Prochaines micro-actions
1. Mettre à jour le `README.md` avec la matrice de conformité (Phase 0.1).
2. Définir les scripts de tests cibles et les ajouter dans `package.json` (Phase 0.2).
3. Démarrer le développement de `ProtocolManager` conformément aux Étapes 1.1 et 1.2.
