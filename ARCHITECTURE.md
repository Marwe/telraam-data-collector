# Architecture Documentation

## Overview

This document describes the architecture and design decisions for the Telraam Data Collector. The codebase follows TypeScript best practices with a focus on **type safety**, **maintainability**, and **separation of concerns**.

## Design Principles

1. **Type Safety First**: All types are derived from the OpenAPI specification to ensure API contract compliance
2. **Single Responsibility**: Each module has a clear, focused purpose
3. **Dependency Injection**: Components are loosely coupled and easily testable
4. **Explicit Error Handling**: Custom error types and comprehensive error messages
5. **Immutability**: Use of `readonly` and `const` where appropriate

## Architecture Layers

```

                      index.ts
              (Application Entry Point)
,



                   collector.ts
            (Orchestration Layer)
  - Coordinates data collection workflow
  - Manages multiple devices
  - Aggregates results
,,



  telraamClient.ts          storage.ts
  (API Layer)             (Persistence Layer)
  - API requests          - File I/O
  - Authentication        - Deduplication
  - Error handling        - Data grouping




              generated/telraam-api.ts
          (OpenAPI Generated Types)
  - Auto-generated from OpenAPI spec
  - Single source of truth for API contracts

```

## Module Breakdown

### 1. types.ts

**Purpose**: Central type definitions and type transformations

**Key Features**:

- Extracts types from OpenAPI-generated definitions
- Defines domain-specific interfaces
- Provides utility types for internal use

**Type Hierarchy**:

```typescript
// API Types (from OpenAPI)
TrafficReportRequest    Request body type
TrafficReportResponse   Response body type
TrafficDataPoint        Individual data point

// Domain Types
DeviceConfig            Device configuration
DeviceMetadata          Stored device metadata
MonthlyData             Monthly data file structure

// Utility Types
DateRange               Date range for queries
CollectionResult        Single device collection result
CollectionSummary       Overall collection summary
```

### 2. telraamClient.ts

**Purpose**: HTTP client for Telraam API

**Key Features**:

- **Type-safe API requests** using `openapi-typescript-fetch`
- Compile-time validation of request/response types
- Custom `TelraamApiError` for structured error handling
- Automatic authentication header injection
- Built directly on OpenAPI specification

**Technology**:

- Uses `openapi-typescript-fetch` for type-safe fetch client
- Works directly with generated OpenAPI types
- No manual type definitions needed

**API Contract**:

```typescript
class TelraamClient {
  fetchTrafficData(deviceId: string, dateRange: DateRange): Promise<TrafficDataPoint[]>;
}
```

**Type Safety**:

```typescript
// The fetcher knows all available endpoints and their types
const getTraffic = this.fetcher
  .path('/v1/reports/traffic') //  Type-checked path
  .method('post') //  Type-checked method
  .create();

// Request body is fully typed from OpenAPI spec
const response = await getTraffic(requestBody);
// response.data is typed from OpenAPI spec
```

**Error Handling**:

```typescript
class TelraamApiError extends Error {
  statusCode?: number;
  responseData?: unknown;
}
```

### 3. storage.ts

**Purpose**: File-based persistence layer

**Key Features**:

- Atomic file operations with error recovery
- Automatic directory creation
- Data deduplication using ISO timestamps
- Monthly data grouping

**Data Flow**:

```
API Data  groupDataByMonth()  MonthlyData  mergeDataPoints()  File System
```

**Deduplication Strategy**:

- Uses full ISO timestamp as unique key
- Newer data overwrites older data
- Maintains sorted order by date

### 4. collector.ts

**Purpose**: Orchestration layer for data collection

**Key Features**:

- Configuration via dependency injection
- Individual device error isolation
- Detailed collection summaries
- Progress logging

**Collection Flow**:

```
collectAllDevices()
   collectSingleDevice(device1)
       fetchTrafficData()
       saveDeviceData()
   collectSingleDevice(device2)
   createSummary()
```

**Date range**: Controlled by `TELRAAM_DAYS_TO_FETCH` (clamped 1–90). Defaults to 31 locally; CI workflow sets 3 for daily runs, with manual override via workflow input.

**Daily aggregates**: After saving hourly monthly files, the collector also writes per-day totals under `docs/data/device_{id}/daily/{month}.json`.

**Configuration Pattern**:

```typescript
interface CollectorConfig {
  client: TelraamClient;
  storage: Storage;
  devices: DeviceConfig[];
  daysToFetch: number;
}
```

### 5. index.ts

**Purpose**: Application entry point and initialization

**Key Features**:

- Environment validation
- Component initialization
- Error boundary
- Performance metrics

**Startup Sequence**:

```
1. Load environment variables
2. Validate configuration
3. Initialize components (Client, Storage, Collector)
4. Run collection
5. Log summary and exit
```

## Data Flow

### Collection Process

```
1. User triggers collection


2. Collector calculates date range (today - N days)


3. For each device:

    TelraamClient.fetchTrafficData()
        Build API request
        POST to /v1/reports/traffic
        Validate & return TrafficDataPoint[]


4. Storage.groupDataByMonth()
        Split data by YYYY-MM


5. For each month:

    Storage.loadMonthlyData() (if exists)
    Storage.mergeDataPoints() (deduplicate)
    Storage.saveMonthlyData()


6. Generate CollectionSummary


7. Save DeviceMetadata


8. Exit with status code
```

### File Structure

```
docs/data/
  devices.json              # Device metadata
    [DeviceMetadata[]]

  device_{id}/              # Per-device directory
    2024-11.json            # Monthly data file
      MonthlyData
        device_id: string
        month: "2024-11"
        lastUpdated: ISO timestamp
        data: TrafficDataPoint[]

    2024-12.json
    daily/                  # Daily aggregates (by month)
      2024-11.json
        DailyData
          device_id: string
          month: "2024-11"
          lastUpdated: ISO timestamp
          days: DailyEntry[] (per-day totals)
      2024-12.json
docs/index.html             # Auto-generated landing page linking all JSON files
```

## Type Safety Strategy

### OpenAPI Integration

1. **Source of Truth**: OpenAPI spec defines API contract
2. **Type Generation**: `openapi-typescript` generates TypeScript types
3. **Type Extraction**: `types.ts` extracts and transforms types
4. **Type Propagation**: All modules use derived types

### Type Flow

```
OpenAPI Spec (YAML)

   (openapi-typescript)
generated/telraam-api.ts

   (type extraction)
types.ts

   telraamClient.ts
   storage.ts
   collector.ts
   index.ts
```

### Benefits

**Compile-time safety**: Type errors caught before runtime
**Auto-completion**: Full IDE support for API fields
**Refactoring confidence**: Breaking changes detected immediately
**Documentation**: Types serve as inline documentation
**API contract validation**: Ensures code matches API spec

## Error Handling

### Error Hierarchy

```
Error (base)

   TelraamApiError
       statusCode: number
       responseData: unknown

   Standard Error
        message: string
```

### Error Propagation

```
API Layer (telraamClient.ts)
   Throws TelraamApiError


Orchestration Layer (collector.ts)
   Catches and formats error
   Logs error details
   Returns CollectionResult { success: false, error }


Application Layer (index.ts)
   Final error handler
        Logs stack trace
        Exits with code 1
```

### Error Isolation

- **Device-level isolation**: One device failure doesn't stop others
- **Graceful degradation**: Partial success is possible
- **Detailed reporting**: `CollectionSummary` includes all errors

## Best Practices

### 1. Immutability

```typescript
//  Good: readonly fields
private readonly client: AxiosInstance;

// L Bad: mutable fields
private client: AxiosInstance;
```

### 2. Explicit Types

```typescript
//  Good: explicit return type
async fetchData(): Promise<TrafficDataPoint[]> { }

// L Bad: inferred return type
async fetchData() { }
```

### 3. Error Messages

```typescript
//  Good: descriptive error
throw new Error(
  'TELRAAM_API_KEY environment variable is not set. Please set it in your .env file.',
);

// L Bad: vague error
throw new Error('Missing API key');
```

### 4. Single Responsibility

```typescript
//  Good: focused class
class TelraamClient {
  fetchTrafficData() {}
}

class Storage {
  saveMonthlyData() {}
}

// L Bad: mixed concerns
class DataManager {
  fetchTrafficData() {}
  saveMonthlyData() {}
}
```

### 5. Dependency Injection

```typescript
//  Good: dependencies injected
constructor(config: CollectorConfig) {
  this.client = config.client;
}

// L Bad: dependencies created internally
constructor() {
  this.client = new TelraamClient(...);
}
```

## Testing Strategy

### Unit Testing

Each module can be tested independently:

```typescript
// Example: TelraamClient test
const mockAxios = createMockAxios();
const client = new TelraamClient('https://api', 'key');
// Test API calls, error handling, etc.
```

### Integration Testing

Test module interactions:

```typescript
// Example: Collector integration test
const client = new TelraamClient(...);
const storage = new Storage(...);
const collector = new DataCollector({ client, storage, ... });
// Test full collection flow
```

## Performance Considerations

### 1. Sequential Device Processing

Currently processes devices sequentially to:

- Respect API rate limits
- Simplify error handling
- Maintain clear logs

**Future**: Could add parallel processing with concurrency limits.

### 2. File I/O Optimization

- Uses `fs.promises` for async operations
- Creates directories recursively in one call
- Reads/writes files only when necessary

### 3. Memory Efficiency

- Processes one device at a time
- Doesn't load all data into memory
- Groups data by month before saving

## Maintenance Guide

### Adding a New API Endpoint

1. Update OpenAPI spec in `api-spec/telraam-openapi.yaml`
2. Run `npm run generate-types`
3. Extract types in `src/types.ts`
4. Add method to `TelraamClient`
5. Update tests

### Modifying Data Structure

1. Update types in `src/types.ts`
2. Update storage logic in `src/storage.ts`
3. Update existing data files (migration script may be needed)
4. Update documentation

### Changing Configuration

1. Update `src/config.ts`
2. Update validation in `src/index.ts`
3. Update `.env.example`
4. Update README.md

## Future Enhancements

### Potential Improvements

1. **Retry Logic**: Automatic retry for transient failures
2. **Rate Limiting**: Respect API rate limits automatically
3. **Incremental Collection**: Only fetch new data since last run
4. **Data Validation**: Schema validation for API responses
5. **Metrics**: Track API performance and data quality
6. **Parallel Processing**: Concurrent device processing with limits
7. **Compression**: Compress older monthly files
8. **Backup**: Automated backup before overwriting files

## Conclusion

This architecture prioritizes:

- **Type Safety**: OpenAPI-driven types eliminate runtime surprises
- **Maintainability**: Clear separation of concerns and documentation
- **Reliability**: Comprehensive error handling and validation
- **Developer Experience**: Strong IDE support and clear APIs

The codebase is designed to be **production-ready**, **extensible**, and **easy to understand** for developers of all experience levels.
