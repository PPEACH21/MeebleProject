package main

import (
	"fmt"

	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/routes"
	"github.com/gofiber/fiber/v2"
)

func main(){
	app := fiber.New()
	fmt.Println("TEST")

	app.Use(middlewares.CheckMiddleware)
	routes.Routes(app)

	app.Listen(":8080")
}