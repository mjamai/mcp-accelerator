"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryPromptProvider = void 0;
class InMemoryPromptProvider {
    id;
    displayName;
    prompts = new Map();
    constructor(id, displayName, entries = []) {
        this.id = id;
        this.displayName = displayName;
        entries.forEach((prompt) => this.prompts.set(prompt.id, prompt));
    }
    addPrompt(prompt) {
        this.prompts.set(prompt.id, prompt);
    }
    async listPrompts(_context) {
        return Array.from(this.prompts.values()).map((prompt) => ({ ...prompt }));
    }
    async getPrompt(id, _context) {
        const prompt = this.prompts.get(id);
        return prompt ? { ...prompt } : null;
    }
}
exports.InMemoryPromptProvider = InMemoryPromptProvider;
//# sourceMappingURL=in-memory-provider.js.map