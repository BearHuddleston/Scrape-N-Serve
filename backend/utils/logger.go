package utils

import (
	"fmt"
	"log"
	"os"
	"time"
)

// Logger provides a structured logging interface
type Logger struct {
	*log.Logger
	service string
}

// NewLogger creates a new logger instance
func NewLogger(service string) *Logger {
	return &Logger{
		Logger:  log.New(os.Stdout, "", log.LstdFlags),
		service: service,
	}
}

// Info logs an informational message
func (l *Logger) Info(format string, v ...interface{}) {
	l.Output(2, fmt.Sprintf("[INFO] [%s] %s", l.service, fmt.Sprintf(format, v...)))
}

// Error logs an error message
func (l *Logger) Error(format string, v ...interface{}) {
	l.Output(2, fmt.Sprintf("[ERROR] [%s] %s", l.service, fmt.Sprintf(format, v...)))
}

// Debug logs a debug message
func (l *Logger) Debug(format string, v ...interface{}) {
	if os.Getenv("DEBUG") == "true" {
		l.Output(2, fmt.Sprintf("[DEBUG] [%s] %s", l.service, fmt.Sprintf(format, v...)))
	}
}

// RequestLogger logs HTTP request information
func (l *Logger) RequestLogger(method, path, clientIP string, statusCode int, latency time.Duration) {
	l.Info("%s %s %s %d %s", method, path, clientIP, statusCode, latency)
}