"use strict";
/**
 * Authentication Middleware for MCP Accelerator
 * @packageDocumentation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAPIKeyAuthMiddleware = exports.createJWTAuthMiddleware = void 0;
var jwt_auth_1 = require("./jwt-auth");
Object.defineProperty(exports, "createJWTAuthMiddleware", { enumerable: true, get: function () { return jwt_auth_1.createJWTAuthMiddleware; } });
var api_key_auth_1 = require("./api-key-auth");
Object.defineProperty(exports, "createAPIKeyAuthMiddleware", { enumerable: true, get: function () { return api_key_auth_1.createAPIKeyAuthMiddleware; } });
//# sourceMappingURL=index.js.map