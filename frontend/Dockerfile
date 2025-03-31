FROM node:18-bullseye-slim as build

WORKDIR /app

# Install dependencies required for Expo
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Expo CLI globally
RUN npm install -g expo-cli

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies with legacy peer deps flag to avoid conflicts
RUN npm install --legacy-peer-deps

# Install required web dependencies
RUN npm install react-native-web@~0.19.6 react-dom@18.2.0 @expo/metro-runtime@~3.1.3 --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Update the config file to point to the correct backend URL
RUN sed -i 's|http://localhost:8080|http://backend:8080|g' ./services/config.ts

# Build the web version
RUN npx expo export --platform web

# Stage 2: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=build /app/dist /usr/share/nginx/html

# Add custom nginx configuration to handle React Router
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]