FROM node:18 AS builder

WORKDIR /app

# Install dependencies for building the React app
RUN apt-get update && apt-get install -y \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./
COPY tsconfig.json ./
COPY .parcelrc ./

# Install dependencies 
RUN npm install

# Copy frontend source
COPY index.html ./
COPY src ./src
COPY services ./services
COPY styles ./styles

# Update API URL for production
RUN sed -i 's|http://localhost:8080|/api|g' ./services/config.ts

# Build for production with Parcel
RUN npm run build

# Stage 2: Use Nginx to serve the static files
FROM nginx:alpine

# Copy the built app from the previous stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]