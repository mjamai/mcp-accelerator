"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.zodToJsonSchema = void 0;
const zod_1 = require("zod");
let externalConverter = null;
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const maybeModule = require('zod-to-json-schema');
    if (maybeModule && typeof maybeModule.zodToJsonSchema === 'function') {
        externalConverter = (schema, nameOrOptions, maybeOptions) => maybeModule.zodToJsonSchema(schema, nameOrOptions, maybeOptions);
    }
}
catch {
    // Ignore resolution errors – fallback implementation will be used
}
const fallbackConvert = (schema) => {
    const baseSchema = unwrapEffects(schema);
    const typeName = baseSchema._def.typeName;
    switch (typeName) {
        case zod_1.z.ZodFirstPartyTypeKind.ZodString: {
            const stringDef = baseSchema._def;
            const checks = stringDef.checks ?? [];
            const result = { type: 'string' };
            for (const check of checks) {
                if (check.kind === 'min') {
                    result.minLength = check.value;
                }
                else if (check.kind === 'max') {
                    result.maxLength = check.value;
                }
                else if (check.kind === 'regex') {
                    result.pattern = check.regex.source;
                }
                else if (check.kind === 'email') {
                    result.format = 'email';
                }
                else if (check.kind === 'url') {
                    result.format = 'uri';
                }
            }
            return result;
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodNumber: {
            const numberDef = baseSchema._def;
            const checks = numberDef.checks ?? [];
            const result = { type: 'number' };
            for (const check of checks) {
                if (check.kind === 'min') {
                    if (check.inclusive) {
                        result.minimum = check.value;
                    }
                    else {
                        result.exclusiveMinimum = check.value;
                    }
                }
                else if (check.kind === 'max') {
                    if (check.inclusive) {
                        result.maximum = check.value;
                    }
                    else {
                        result.exclusiveMaximum = check.value;
                    }
                }
                else if (check.kind === 'int') {
                    result.type = 'integer';
                }
            }
            return result;
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodBoolean:
            return { type: 'boolean' };
        case zod_1.z.ZodFirstPartyTypeKind.ZodEnum: {
            const enumDef = baseSchema._def;
            return {
                type: 'string',
                enum: [...enumDef.values],
            };
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodLiteral: {
            const literalDef = baseSchema._def;
            return { const: literalDef.value };
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodArray: {
            const arrayDef = baseSchema._def;
            return {
                type: 'array',
                items: fallbackConvert(arrayDef.type),
            };
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodObject: {
            const objectDef = baseSchema._def;
            const shape = objectDef.shape();
            const properties = {};
            const required = [];
            for (const key of Object.keys(shape)) {
                const fieldSchema = shape[key];
                const { jsonSchema, isOptional, defaultValue } = convertWithOptionality(fieldSchema);
                properties[key] = jsonSchema;
                if (defaultValue !== undefined) {
                    properties[key].default = defaultValue;
                }
                if (!isOptional) {
                    required.push(key);
                }
            }
            const result = {
                type: 'object',
                properties,
            };
            if (required.length > 0) {
                result.required = required;
            }
            if (objectDef.unknownKeys === 'strip') {
                result.additionalProperties = false;
            }
            return result;
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodUnion: {
            const unionDef = baseSchema._def;
            return {
                anyOf: unionDef.options.map((option) => fallbackConvert(option)),
            };
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodRecord: {
            const recordDef = baseSchema._def;
            return {
                type: 'object',
                additionalProperties: fallbackConvert(recordDef.valueType),
            };
        }
        case zod_1.z.ZodFirstPartyTypeKind.ZodTuple: {
            const tupleDef = baseSchema._def;
            return {
                type: 'array',
                items: tupleDef.items.map((item) => fallbackConvert(item)),
                minItems: tupleDef.items.length,
                maxItems: tupleDef.items.length,
            };
        }
        default:
            return {};
    }
};
const convertWithOptionality = (schema) => {
    let current = schema;
    let isOptional = false;
    let defaultValue;
    // Handle optional wrapper
    if (current instanceof zod_1.z.ZodOptional) {
        isOptional = true;
        current = current._def.innerType;
    }
    // Handle default wrapper
    if (current instanceof zod_1.z.ZodDefault) {
        const defaultSchema = current;
        defaultValue = defaultSchema._def.defaultValue();
        current = defaultSchema._def.innerType;
        isOptional = true;
    }
    const jsonSchema = fallbackConvert(current);
    return { jsonSchema, isOptional, defaultValue };
};
const unwrapEffects = (schema) => {
    let current = schema;
    while (current instanceof zod_1.z.ZodEffects) {
        current = current._def.schema;
    }
    return current;
};
const zodToJsonSchema = (schema) => {
    if (externalConverter) {
        const converted = externalConverter(schema, {
            target: 'jsonSchema7',
            $refStrategy: 'none',
        });
        if (converted && typeof converted === 'object' && '$schema' in converted) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete converted['$schema'];
        }
        return converted;
    }
    return fallbackConvert(schema);
};
exports.zodToJsonSchema = zodToJsonSchema;
//# sourceMappingURL=zod-to-json-schema.js.map