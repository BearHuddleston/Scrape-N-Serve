package db

import (
	"log"
	"os"

	"github.com/arkouda/scrape-n-serve/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var (
	DB *gorm.DB
)

// Connect establishes connection to the database and performs automigration
func Connect() error {
	// Get database URL from environment variable or use default
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		dsn = "postgres://postgres:postgres@localhost:5432/scrape_n_serve"
	}

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		return err
	}

	// Auto migrate the models
	if err := DB.AutoMigrate(&models.ScrapedItem{}); err != nil {
		log.Printf("Failed to auto migrate: %v", err)
		return err
	}

	log.Println("Connected to database and migrations applied")
	return nil
}

// Close closes the database connection
func Close() error {
	db, err := DB.DB()
	if err != nil {
		return err
	}
	return db.Close()
}
