FROM node:18

WORKDIR /app

# Install dependencies for building the React Native web app
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies 
RUN npm install

# Install web dependencies
RUN npm install react-dom@18.3.1 react-native-web@~0.19.13 @expo/metro-runtime@~4.0.1 express http-proxy-middleware

# Copy app source
COPY app.json ./
COPY App.tsx ./
COPY src ./src
COPY assets ./assets
COPY index.ts ./
COPY server.js ./

# Update API URL for production
RUN sed -i 's|http://10.0.2.2:8080|/api|g' ./src/services/config.ts

# Update API endpoints for production (v1 paths)
RUN sed -i 's|/api/v1/|/api/|g' ./src/services/config.ts

# Build for web
RUN npx expo export -p web

# Expose port 80
EXPOSE 80

# Start the server
CMD ["node", "server.js"]