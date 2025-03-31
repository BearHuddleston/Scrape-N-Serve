FROM node:18 AS builder

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

# Copy app source
COPY app.json ./
COPY App.tsx ./
COPY src ./src
COPY assets ./assets

# Update API URL for production
RUN sed -i 's|http://10.0.2.2:8080|/api|g' ./src/services/config.ts

# Build static version for web
RUN npx expo export:web

# Stage 2: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration - use the same as main frontend
COPY ../frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]