"use strict";
/**
 * CORS Configuration for MCP Accelerator
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamicOriginCORS = exports.productionCORS = exports.developmentCORS = exports.createCORSOptions = void 0;
var cors_1 = require("./cors");
Object.defineProperty(exports, "createCORSOptions", { enumerable: true, get: function () { return cors_1.createCORSOptions; } });
Object.defineProperty(exports, "developmentCORS", { enumerable: true, get: function () { return cors_1.developmentCORS; } });
Object.defineProperty(exports, "productionCORS", { enumerable: true, get: function () { return cors_1.productionCORS; } });
Object.defineProperty(exports, "dynamicOriginCORS", { enumerable: true, get: function () { return cors_1.dynamicOriginCORS; } });
//# sourceMappingURL=index.js.map