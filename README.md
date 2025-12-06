# Telraam Data Collector

Automated data collection system for Telraam traffic counting devices in Karlsruhe, Germany. This TypeScript application fetches hourly traffic data from the Telraam API and stores it in an organized, deduplicated format.

Live data (GitHub Pages): https://maxliesegang.github.io/telraam-data-collector/

## Features

- Fetches traffic data from Telraam API for multiple devices
- Stores data organized by device and month
- Automatically merges new data with existing records (no duplicates)
- GitHub Actions workflow for daily automated collection
- Production-ready with comprehensive error handling and logging
- TypeScript with full type safety

## Data Structure

Data is stored under `docs/data` so it can be served directly via GitHub Pages (default docs root).

```
docs/data/
  devices.json                    # Device metadata
  device_XXXXXX/                  # Per-device directories
    hourly/                       # Hourly data files (per month)
      2024-12.json
      2025-01.json
      ...
    daily/                        # Daily aggregates (per month)
      2024-12.json
      2025-01.json
```

### Device Metadata (`devices.json`)

```json
[
  {
    "id": "9000004698",
    "name": "Telraam Karlsruhe 1",
    "location": "Karlsruhe, Germany",
    "lastUpdated": "2024-12-06T10:30:00.000Z",
    "totalDataPoints": 1440
  }
]
```

### Monthly Data Files

Each monthly file contains hourly traffic data:

```json
{
  "device_id": "9000004698",
  "month": "2024-12",
  "lastUpdated": "2024-12-06T10:30:00.000Z",
  "data": [
    {
      "date": "2024-12-01",
      "hour": 0,
      "uptime": 0.95,
      "heavy": 2,
      "car": 15,
      "bike": 3,
      "pedestrian": 5,
      "heavy_lft": 1,
      "car_lft": 8,
      "bike_lft": 2,
      "pedestrian_lft": 3,
      "heavy_rgt": 1,
      "car_rgt": 7,
      "bike_rgt": 1,
      "pedestrian_rgt": 2,
      "direction": 1,
      "timezone": "Europe/Berlin",
      "v85": 35.5
    }
  ]
}
```

## Setup

### Prerequisites

- Node.js 20 or higher
- npm
- Telraam API key ([get one here](https://telraam.net/en/users/settings))

### Installation

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd telraam-data-collector
   ```

2. Install dependencies:

   ```bash
   npm ci
   ```

3. Create environment file:

   ```bash
   cp .env.example .env
   ```

4. Add your Telraam API key to `.env`:

   ```
   TELRAAM_API_KEY=your_actual_api_key_here
   # Optional: override days to fetch (clamped 1-90). Defaults to 31 locally, 3 in CI.
   TELRAAM_DAYS_TO_FETCH=31
   ```

5. Update device list in [src/config.ts](src/config.ts):
   ```typescript
   export const devices: DeviceConfig[] = [
     {
       id: '9000004698',
       name: 'Telraam Karlsruhe 1',
       location: 'Karlsruhe, Germany',
     },
     // Add more devices here
   ];
   ```

## Usage

### Manual Collection

Run data collection manually:

```bash
npm run collect
```

This will:

1. Build the TypeScript code
2. Fetch data for the last N days for all configured devices (N defaults to `TELRAAM_DAYS_TO_FETCH` or 31 locally)
3. Merge new data with existing files (hourly and daily aggregates)
4. Update device metadata

## Data License

- Telraam data in this repository are provided under **CC BY-NC** (non-commercial) terms.
- You may use, adapt, and publish the data for non-commercial purposes with attribution to Telraam.
- For commercial use or if in doubt, contact **info@telraam.net** to discuss permissions and fair reward for contributors.
- See [DATA_LICENSE.md](DATA_LICENSE.md) for details (source: Telraam FAQ https://faq.telraam.net/article/9/telraam-data-license-what-can-i-do-with-the-telraam-data).

### Development

Run in development mode (no build step):

```bash
npm run dev
```

### Formatting

This project uses Prettier for consistent formatting:

- Format in-place: `npm run format`
- Check only: `npm run format:check`

### Build Only

Compile TypeScript without running:

```bash
npm run build
```

Note: `npm run build` regenerates API types from `api-spec/telraam-openapi.yaml` before compiling; keep that spec file present and up to date.

## OpenAPI Specification (Optional)

This project supports generating TypeScript types from the official Telraam API OpenAPI specification for enhanced type safety and API contract validation.

### Adding the OpenAPI Spec

1. Obtain the Telraam API OpenAPI specification (YAML or JSON format)
2. Open [api-spec/telraam-openapi.yaml](api-spec/telraam-openapi.yaml)
3. Paste the complete specification into the file
4. Generate TypeScript types:
   ```bash
   npm run generate-types
   ```

This creates type definitions in `src/generated/telraam-api.ts` that you can use in your code.

### Using Generated Types

Once types are generated, you can import and use them:

```typescript
import type { paths, components } from './generated/telraam-api.js';

// Use API-specific types
type TrafficReportRequest =
  paths['/reports/traffic']['post']['requestBody']['content']['application/json'];
type TrafficReportResponse =
  paths['/reports/traffic']['post']['responses']['200']['content']['application/json'];
```

For detailed instructions, see [api-spec/README.md](api-spec/README.md).

## GitHub Actions Setup

The project includes automated daily data collection via GitHub Actions.

### Configuration Steps

1. Add your Telraam API key as a GitHub secret:
   - Go to your repository settings
   - Navigate to **Secrets and variables** � **Actions**
   - Click **New repository secret**
   - Name: `TELRAAM_API_KEY`
   - Value: Your Telraam API key
   - Click **Add secret**

2. The workflow will automatically:
   - Run daily at 2:00 AM UTC
   - Fetch the last 3 days by default for all configured devices
   - Commit and push updated data files

3. Manual trigger with custom window:
   - Go to the **Actions** tab in your repository
   - Select **Collect Telraam Data**
   - Click **Run workflow** and set the **days** input (e.g., `90` for an initial backfill)

### Workflow File

See [.github/workflows/collect-data.yml](.github/workflows/collect-data.yml) for the workflow configuration.

## Configuration

### API Settings

Edit [src/config.ts](src/config.ts) to customize:

```typescript
export const config = {
  apiUrl: 'https://telraam-api.net/v1/reports/traffic',
  apiKey: process.env.TELRAAM_API_KEY || '',
  dataDir: './docs/data',
  daysToFetch: 31, // Number of days to fetch
};
```

### Adding Devices

Add new devices to the `devices` array in [src/config.ts](src/config.ts):

```typescript
export const devices: DeviceConfig[] = [
  {
    id: '9000004698',
    name: 'Telraam Karlsruhe 1',
    location: 'Karlsruhe, Germany',
  },
  {
    id: '9000004699',
    name: 'Telraam Karlsruhe 2',
    location: 'Karlsruhe, Germany',
  },
];
```

## Project Structure

```
telraam-data-collector/
  .github/
    workflows/
      collect-data.yml         # GitHub Actions workflow
  docs/data/                   # Generated data directory served via GitHub Pages
  src/
    index.ts                   # Main entry point
    types.ts                   # TypeScript interfaces
    config.ts                  # Configuration
    telraamClient.ts           # API client
    collector.ts               # Data collection orchestrator
    services/                  # Service layer (modular architecture)
      Storage.ts               # Storage facade
      FileService.ts           # File I/O operations
      DataMerger.ts            # Data transformation logic
      PathManager.ts           # Path construction utilities
      HTMLGenerator.ts         # Landing page generation
      RetryStrategy.ts         # Retry logic with backoff
      index.ts                 # Service exports
    utils/                     # Utility modules
      logger.ts                # Structured logging
      datetime.ts              # Date/time utilities
      validation.ts            # Validation functions
      constants.ts             # Application constants
      index.ts                 # Utility exports
  api-spec/                    # OpenAPI spec input (optional)
  dist/                        # Build output
  package.json                 # Dependencies and scripts
  tsconfig.json                # TypeScript configuration
  README.md                    # This file
  ARCHITECTURE.md              # Architecture documentation
  REFACTORING_SUMMARY.md       # Recent refactoring details
  .env.example                 # Environment template
  .env                         # Your API key (git-ignored)
```

### Landing Page

`docs/index.html` is auto-generated after each collection run and lists links to all available `.json` files for easy browsing on GitHub Pages.

## How It Works

1. **TelraamClient** ([src/telraamClient.ts](src/telraamClient.ts))
   - Handles API authentication and requests
   - Fetches hourly traffic data for specified date ranges
   - Automatic retry with exponential backoff for transient failures

2. **Service Layer** ([src/services/](src/services/))
   - **Storage**: Facade orchestrating all storage operations
   - **FileService**: Low-level file I/O with error recovery
   - **DataMerger**: Pure functions for data transformation and deduplication
   - **PathManager**: Centralized path construction and management
   - **HTMLGenerator**: Dynamic landing page generation for GitHub Pages
   - **RetryStrategy**: Reusable retry logic with configurable policies

3. **DataCollector** ([src/collector.ts](src/collector.ts))
   - Orchestrates the collection process
   - Processes multiple devices with error isolation
   - Updates device metadata
   - Generates daily aggregates from hourly data

4. **Main** ([src/index.ts](src/index.ts))
   - Entry point
   - Loads environment variables
   - Initializes components with dependency injection
   - Runs collection and reports comprehensive results

## Data Deduplication

The system uses ISO timestamps as unique keys to prevent duplicates. When new data is fetched:

1. Existing monthly file is loaded (if it exists)
2. New data points are merged with existing data
3. Duplicates are automatically removed
4. Data is sorted by date and hour
5. Updated file is saved

This ensures that running the collector multiple times won't create duplicate entries.

## Error Handling

- API failures are logged with detailed error messages
- Collection continues for other devices if one fails
- Process exits with error code 1 if any device fails
- GitHub Actions workflow will show failed status on errors

## Logging

All operations are logged to console with prefixed tags:

- `[TelraamClient]` - API operations
- `[Storage]` - File operations
- `[Collector]` - Collection orchestration

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues with:

- **This collector**: Open an issue in this repository
- **Telraam API**: Contact [Telraam support](https://telraam.net)
- **Your devices**: Check the [Telraam dashboard](https://telraam.net)
