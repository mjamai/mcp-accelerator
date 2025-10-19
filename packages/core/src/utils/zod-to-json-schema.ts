import type { ZodTypeAny, ZodDefault, ZodOptional, ZodEffects } from 'zod';
import { z } from 'zod';

type JsonSchema = Record<string, unknown>;

type ExternalConverter = (
  schema: ZodTypeAny,
  nameOrOptions?: unknown,
  maybeOptions?: unknown,
) => JsonSchema;

let externalConverter: ExternalConverter | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
  const maybeModule = require('zod-to-json-schema');
  if (maybeModule && typeof maybeModule.zodToJsonSchema === 'function') {
    externalConverter = (schema: ZodTypeAny, nameOrOptions?: unknown, maybeOptions?: unknown) =>
      maybeModule.zodToJsonSchema(schema, nameOrOptions, maybeOptions);
  }
} catch {
  // Ignore resolution errors – fallback implementation will be used
}

const fallbackConvert = (schema: ZodTypeAny): JsonSchema => {
  const baseSchema = unwrapEffects(schema);
  const typeName = baseSchema._def.typeName;

  switch (typeName) {
    case z.ZodFirstPartyTypeKind.ZodString: {
      const stringDef = baseSchema._def;
      const checks = stringDef.checks ?? [];
      const result: JsonSchema = { type: 'string' };

      for (const check of checks) {
        if (check.kind === 'min') {
          result.minLength = check.value;
        } else if (check.kind === 'max') {
          result.maxLength = check.value;
        } else if (check.kind === 'regex') {
          result.pattern = check.regex.source;
        } else if (check.kind === 'email') {
          result.format = 'email';
        } else if (check.kind === 'url') {
          result.format = 'uri';
        }
      }

      return result;
    }

    case z.ZodFirstPartyTypeKind.ZodNumber: {
      const numberDef = baseSchema._def;
      const checks = numberDef.checks ?? [];
      const result: JsonSchema = { type: 'number' };

      for (const check of checks) {
        if (check.kind === 'min') {
          if (check.inclusive) {
            result.minimum = check.value;
          } else {
            result.exclusiveMinimum = check.value;
          }
        } else if (check.kind === 'max') {
          if (check.inclusive) {
            result.maximum = check.value;
          } else {
            result.exclusiveMaximum = check.value;
          }
        } else if (check.kind === 'int') {
          result.type = 'integer';
        }
      }

      return result;
    }

    case z.ZodFirstPartyTypeKind.ZodBoolean:
      return { type: 'boolean' };

    case z.ZodFirstPartyTypeKind.ZodEnum: {
      const enumDef = (baseSchema as z.ZodEnum<[string, ...string[]]>)._def;
      return {
        type: 'string',
        enum: [...enumDef.values],
      };
    }

    case z.ZodFirstPartyTypeKind.ZodLiteral: {
      const literalDef = (baseSchema as z.ZodLiteral<unknown>)._def;
      return { const: literalDef.value };
    }

    case z.ZodFirstPartyTypeKind.ZodArray: {
      const arrayDef = (baseSchema as z.ZodArray<ZodTypeAny>)._def;
      return {
        type: 'array',
        items: fallbackConvert(arrayDef.type),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodObject: {
      const objectDef = (baseSchema as z.ZodObject<any>)._def;
      const shape = objectDef.shape();
      const properties: Record<string, JsonSchema> = {};
      const required: string[] = [];

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

      const result: JsonSchema = {
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

    case z.ZodFirstPartyTypeKind.ZodUnion: {
      const unionDef = (baseSchema as z.ZodUnion<[ZodTypeAny, ZodTypeAny]>)._def;
      return {
        anyOf: unionDef.options.map((option: ZodTypeAny) => fallbackConvert(option)),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodRecord: {
      const recordDef = (baseSchema as z.ZodRecord<ZodTypeAny>)._def;
      return {
        type: 'object',
        additionalProperties: fallbackConvert(recordDef.valueType),
      };
    }

    case z.ZodFirstPartyTypeKind.ZodTuple: {
      const tupleDef = (baseSchema as z.ZodTuple)._def;
      return {
        type: 'array',
        items: tupleDef.items.map((item: ZodTypeAny) => fallbackConvert(item)),
        minItems: tupleDef.items.length,
        maxItems: tupleDef.items.length,
      };
    }

    default:
      return {};
  }
};

const convertWithOptionality = (schema: ZodTypeAny) => {
  let current: ZodTypeAny = schema;
  let isOptional = false;
  let defaultValue: unknown;

  // Handle optional wrapper
  if (current instanceof z.ZodOptional) {
    isOptional = true;
    current = (current as ZodOptional<ZodTypeAny>)._def.innerType;
  }

  // Handle default wrapper
  if (current instanceof z.ZodDefault) {
    const defaultSchema = current as ZodDefault<ZodTypeAny>;
    defaultValue = defaultSchema._def.defaultValue();
    current = defaultSchema._def.innerType;
    isOptional = true;
  }

  const jsonSchema = fallbackConvert(current);
  return { jsonSchema, isOptional, defaultValue };
};

const unwrapEffects = (schema: ZodTypeAny): ZodTypeAny => {
  let current = schema;
  while (current instanceof z.ZodEffects) {
    current = (current as ZodEffects<ZodTypeAny>)._def.schema;
  }
  return current;
};

export const zodToJsonSchema = (schema: ZodTypeAny): JsonSchema => {
  if (externalConverter) {
    const converted = externalConverter(schema, {
      target: 'jsonSchema7',
      $refStrategy: 'none',
    });

    if (converted && typeof converted === 'object' && '$schema' in converted) {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (converted as Record<string, unknown>)['$schema'];
    }

    return converted as JsonSchema;
  }

  return fallbackConvert(schema);
};
