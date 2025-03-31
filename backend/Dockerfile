FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o scrape-n-serve .

# Create lightweight production image
FROM alpine:latest

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/scrape-n-serve /app/

# Expose port
EXPOSE 8080

# Run the application
CMD ["./scrape-n-serve"]