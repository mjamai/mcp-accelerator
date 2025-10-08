"use strict";
/**
 * Types et interfaces centraux du framework MCP Accelerator
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HookPhase = void 0;
/**
 * Lifecycle hook phases
 */
var HookPhase;
(function (HookPhase) {
    HookPhase["OnStart"] = "onStart";
    HookPhase["OnStop"] = "onStop";
    HookPhase["OnClientConnect"] = "onClientConnect";
    HookPhase["OnClientDisconnect"] = "onClientDisconnect";
    HookPhase["BeforeToolExecution"] = "beforeToolExecution";
    HookPhase["AfterToolExecution"] = "afterToolExecution";
    HookPhase["OnError"] = "onError";
    HookPhase["OnRequest"] = "onRequest";
    HookPhase["OnResponse"] = "onResponse";
})(HookPhase || (exports.HookPhase = HookPhase = {}));
//# sourceMappingURL=index.js.map