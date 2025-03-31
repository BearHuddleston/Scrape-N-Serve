FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o scrape-n-serve .

# Create lightweight production image
FROM alpine:latest

# Add necessary packages and CA certificates
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/scrape-n-serve .

# Make the binary executable
RUN chmod +x ./scrape-n-serve

# Expose port
EXPOSE 8080

# Run the application
CMD ["./scrape-n-serve"]