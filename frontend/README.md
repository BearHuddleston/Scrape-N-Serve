# Scrape-N-Serve React Native App

A mobile application interface for the Scrape-N-Serve web scraping service.

## Overview

This React Native application provides a mobile interface to the Scrape-N-Serve backend API, allowing users to:

- Initiate web scraping operations
- Monitor scraping status
- View and browse scraped data
- See detailed information about scraped items

## Setup Instructions

### Prerequisites

- Node.js v16 or higher
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android development/emulation)
- Xcode (for iOS development/simulation, macOS only)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/BearHuddleston/Scrape-N-Serve.git
   cd Scrape-N-Serve/frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

4. Run on a device or emulator:
   - Press `a` to run on Android emulator
   - Press `i` to run on iOS simulator (macOS only)
   - Scan the QR code with the Expo Go app on your physical device

## API Configuration

The application is configured to connect to the Scrape-N-Serve backend API. By default, it's set to connect to `http://10.0.2.2:8080` for Android emulator development.

To change the API URL, edit `src/services/config.ts`:

```typescript
// For Android emulator: 10.0.2.2 (points to host machine's localhost)
// For iOS simulator: localhost
// For physical devices: Use your computer's IP address on the same network
export const API_URL = 'http://10.0.2.2:8080';
```

## Features

- **Home Screen**: Start scraping operations and monitor status
- **Data List Screen**: View and browse scraped data with pagination
- **Redux State Management**: Clean state management with Redux Toolkit
- **API Integration**: Fully integrated with the Scrape-N-Serve backend API
- **Material Design**: Consistent UI using React Native Paper components

## Development

### Project Structure

```
frontend/
  ├── src/
  │   ├── components/       # Reusable UI components
  │   ├── screens/          # Main app screens
  │   ├── navigation/       # Navigation configuration
  │   └── services/         # API and state management
  │       ├── apiService.ts # API communication
  │       ├── config.ts     # Configuration
  │       ├── dataSlice.ts  # Redux slice for data
  │       └── store.ts      # Redux store
  ├── App.tsx               # Root component
  └── package.json          # Dependencies
```

### Running Tests

```bash
npm test
```

### Building for Production

To create a production build:

```bash
expo build:android  # For Android
expo build:ios      # For iOS (requires Apple Developer account)
```

## License

MIT