package main

import (
	"os"
	"sync"
)

type Config struct {
	DBURL          string
	TargetWebsite  string
	ScrapingPeriod int // in minutes
}

var (
	config Config
	once   sync.Once
)

func GetConfig() Config {
	once.Do(func() {
		config = Config{
			DBURL:          getEnv("DB_URL", "postgres://postgres:postgres@localhost:5432/scrape_n_serve"),
			TargetWebsite:  getEnv("TARGET_WEBSITE", "https://example.com"),
			ScrapingPeriod: 60, // default to 60 minutes
		}
	})
	return config
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
