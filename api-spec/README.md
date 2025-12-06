# Telraam API OpenAPI Specification

This directory contains the OpenAPI specification for the Telraam API.

## Adding the OpenAPI Specification

1. **Obtain the OpenAPI spec** from Telraam API documentation or API endpoint
2. **Open** [telraam-openapi.yaml](telraam-openapi.yaml)
3. **Paste** the complete OpenAPI specification below the comment line
4. **Save** the file

## Generating TypeScript Types

Once you've added the OpenAPI specification, generate TypeScript types:

```bash
npm run generate-types
```

This will create type definitions in [src/generated/telraam-api.ts](../src/generated/telraam-api.ts)

### Watch Mode

To automatically regenerate types when the OpenAPI spec changes:

```bash
npm run generate-types:watch
```

## Using Generated Types

After generating types, you can import and use them in your TypeScript code:

```typescript
import type { paths, components } from './generated/telraam-api.js';

// Extract specific types from the API spec
type TrafficReportRequest =
  paths['/reports/traffic']['post']['requestBody']['content']['application/json'];
type TrafficReportResponse =
  paths['/reports/traffic']['post']['responses']['200']['content']['application/json'];

// Or use schema components
type TrafficDataPoint = components['schemas']['TrafficDataPoint'];
```

## Benefits of Using OpenAPI Types

1. **Type Safety** - Ensure your requests/responses match the API specification
2. **Auto-completion** - Get IDE suggestions for API fields and parameters
3. **Documentation** - Types serve as inline documentation
4. **Validation** - Catch API mismatches at compile time, not runtime
5. **Maintainability** - Easy to update types when the API changes

## Updating the Implementation

After generating types from the OpenAPI spec, you may want to:

1. Update [src/types.ts](../src/types.ts) to use generated types
2. Modify [src/telraamClient.ts](../src/telraamClient.ts) to use typed requests/responses
3. Ensure all interfaces align with the official API specification

## File Format

The specification can be in either:

- **YAML** (recommended) - [telraam-openapi.yaml](telraam-openapi.yaml)
- **JSON** - Create `telraam-openapi.json` if needed

Update the `generate-types` script in [package.json](../package.json) if using JSON format.

## OpenAPI Resources

- [OpenAPI Specification](https://swagger.io/specification/)
- [openapi-typescript Documentation](https://github.com/drwpow/openapi-typescript)
- [Telraam API Documentation](https://telraam.net/en/api)
