package main

// seed_hash.go — Helper script to generate a bcrypt password hash.
// Run with: go run ./scripts/seed_hash/main.go
// Then paste the output into migrations/seed_admin.sql
//
// Usage: go run ./scripts/seed_hash/main.go -password "YourAdminPassword"

import (
	"flag"
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	password := flag.String("password", "", "Password to hash (required)")
	cost := flag.Int("cost", 12, "Bcrypt cost factor (min 12)")
	flag.Parse()

	if *password == "" {
		fmt.Fprintln(os.Stderr, "Error: -password is required")
		fmt.Fprintln(os.Stderr, "Usage: go run ./scripts/seed_hash/main.go -password 'YourPassword'")
		os.Exit(1)
	}

	if len(*password) < 12 {
		fmt.Fprintln(os.Stderr, "Error: password must be at least 12 characters")
		os.Exit(1)
	}

	if *cost < 12 {
		*cost = 12
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(*password), *cost)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("Password hash (copy into seed_admin.sql):")
	fmt.Println(string(hash))
	fmt.Println()
	fmt.Println("SQL snippet:")
	fmt.Printf("  password_hash = '%s'\n", string(hash))
}
