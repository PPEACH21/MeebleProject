package main

import (
	"fmt"
	"log"
	"os"

	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/routes"
	"github.com/PPEACH21/MebleBackend-Web/service"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)


func main(){
	godotenv.Load("config/.env")
	app := fiber.New()
	
	config.InitFirebase()
	defer config.Client.Close()
	
	config.ConnectMailer(
		os.Getenv("MAILER_HOST"),
		os.Getenv("MAILER_USERNAME"),
		os.Getenv("MAILER_PASSWORD"),
	)

	app.Use(cors.New(cors.Config{
		AllowOrigins: os.Getenv("FRONTEND_URL"),
		AllowCredentials: true,
	}))

	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Asia/Bangkok",
	}))

	app.Post("/createaccount",service.CreateUser)
	app.Post("/login",service.Login)
	app.Post("/sendotp_repassword", service.OTPrepassword())
	app.Post("/checkEmail", service.CheckEmail)
	app.Post("/checkotp", service.MathOTP)
	app.Put("/changepassword", service.ChangePassword)
	app.Use(middlewares.ProtectedCookie())
		routes.Routes(app)
	
		
	env := os.Getenv("MODE")

	certFile := os.Getenv("CERT_PATH")
	keyFile  := os.Getenv("KEY_PATH")

	if env == "prod" {
		if _, err := os.Stat(certFile); os.IsNotExist(err) {
			log.Println("No cert found. Falling back to HTTP...")
			fmt.Println("Local HTTP server running on http://localhost:8080")
			app.Listen(":8080")
		} else {
			fmt.Println("HTTPS server running on Port:8080")
			if err := app.ListenTLS(":8080", certFile, keyFile); err != nil {
				log.Fatal("Server failed to start:", err)
			}
		}
	} else {
		fmt.Println("Local HTTP server running on Port:8080")
		if err := app.Listen(":8080"); err != nil {
			log.Fatal("Local server failed to start:", err)
		}
	}

}