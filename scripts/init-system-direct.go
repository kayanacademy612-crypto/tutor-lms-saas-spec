package main

import (
	"context"
	"fmt"
	"time"

	"lastsaas/internal/auth"
	"lastsaas/internal/db"
	"lastsaas/internal/models"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func main() {
	uri := "mongodb+srv://kayanacademy612_db_user:TBuVtQrWXqzO9kAI@cluster0.xuqtpg2.mongodb.net/?appName=Cluster0"
	dbName := "tutor_lms_saas"

	fmt.Println("Connecting to MongoDB (with retry)...")
	var database *db.MongoDB
	var err error

	for attempt := 1; attempt <= 5; attempt++ {
		database, err = db.NewMongoDB(uri, dbName)
		if err == nil {
			fmt.Printf("✅ Connected on attempt %d\n", attempt)
			break
		}
		fmt.Printf("Attempt %d failed: %v\n", attempt, err)
		if attempt < 5 {
			fmt.Println("Retrying in 3s...")
			time.Sleep(3 * time.Second)
		}
	}
	if err != nil {
		panic(fmt.Sprintf("Failed after 5 attempts: %v", err))
	}
	defer database.Client.Disconnect(context.Background())

	ctx := context.Background()

	// Check if already initialized
	var sys models.SystemConfig
	err = database.SystemConfig().FindOne(ctx, bson.M{}).Decode(&sys)
	if err == nil && sys.Initialized {
		fmt.Println("✅ System already initialized!")
		return
	}

	fmt.Println("Initializing system...")

	// Create root tenant
	tenantID := primitive.NewObjectID()
	tenant := models.Tenant{
		ID:        tenantID,
		Name:      "Kayan Academy",
		Slug:      "kayan-academy",
		IsRoot:    true,
		IsActive:  true,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}
	_, err = database.Tenants().InsertOne(ctx, tenant)
	if err != nil {
		fmt.Println("Tenant error:", err)
		return
	}
	fmt.Printf("✅ Created tenant: Kayan Academy (root)\n")

	// Create owner user
	userID := primitive.NewObjectID()
	pwService := auth.NewPasswordService()
	passwordHash, _ := pwService.HashPassword("SecurePass123!")
	user := models.User{
		ID:            userID,
		Email:         "admin@kayanacademy.com",
		DisplayName:   "Admin User",
		PasswordHash:  passwordHash,
		AuthMethods:   []models.AuthMethod{models.AuthMethodPassword},
		EmailVerified: true,
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}
	_, err = database.Users().InsertOne(ctx, user)
	if err != nil {
		fmt.Println("User error:", err)
		return
	}
	fmt.Printf("✅ Created owner: admin@kayanacademy.com\n")

	// Create tenant membership
	membership := models.TenantMembership{
		ID:        primitive.NewObjectID(),
		UserID:    userID,
		TenantID:  tenantID,
		Role:      models.RoleOwner,
		JoinedAt:  time.Now(),
		UpdatedAt: time.Now(),
	}
	_, err = database.TenantMemberships().InsertOne(ctx, membership)
	if err != nil {
		fmt.Println("Membership error:", err)
		return
	}
	fmt.Printf("✅ Linked user to tenant as owner\n")

	// Create system config
	now := time.Now()
	sysConfig := models.SystemConfig{
		ID:            primitive.NewObjectID(),
		Initialized:   true,
		InitializedAt: &now,
		InitializedBy: &userID,
		Version:       "1.3",
	}
	_, err = database.SystemConfig().InsertOne(ctx, sysConfig)
	if err != nil {
		fmt.Println("SystemConfig error:", err)
		return
	}

	fmt.Println()
	fmt.Println("🎉 SYSTEM INITIALIZED SUCCESSFULLY!")
	fmt.Println()
	fmt.Println("   Login credentials:")
	fmt.Println("   Email:    admin@kayanacademy.com")
	fmt.Println("   Password: SecurePass123!")
	fmt.Println()
	fmt.Println("   You can now:")
	fmt.Println("   1. Log in at /api/tailux/login")
	fmt.Println("   2. Sign up new schools at /api/tailux/signup")
}
