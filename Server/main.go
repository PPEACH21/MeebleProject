package main

import (
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/routes"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/joho/godotenv"
)


func main(){
	godotenv.Load("config/.env")
	app := fiber.New()
	
	config.InitFirebase()
	defer config.Client.Close()

	app.Use(cors.New())
	app.Post("/login",middlewares.Login)
	app.Post("/createaccount",middlewares.CreateUser)
	
	app.Use(middlewares.GetJwt())
	app.Use(middlewares.CheckMiddleware)
		routes.Routes(app)
		
	app.Listen(":8080")
}