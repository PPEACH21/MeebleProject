package main

import (
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
	
	app.Use(cors.New(cors.Config{
		AllowOrigins: "http://localhost:5173",
		AllowCredentials: true,
	}))

	app.Use(logger.New(logger.Config{
		Format:     "[${time}] ${status} - ${method} ${path}\n",
		TimeFormat: "2006-01-02 15:04:05",
		TimeZone:   "Asia/Bangkok",
	}))

	app.Post("/createaccount",service.CreateUser)
	app.Post("/login",service.Login)
	
	app.Use(middlewares.ProtectedCookie())
		routes.Routes(app)
		
	app.Listen(":8080")
}