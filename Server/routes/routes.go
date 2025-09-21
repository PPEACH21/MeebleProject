package routes

import (
	"github.com/PPEACH21/MebleBackend-Web/controllers"
	"github.com/gofiber/fiber/v2"
)

func Routes(app *fiber.App) {
	app.Get("/getShop", controllers.GetShop)
	app.Put("/setLocation/:ID", controllers.SetLocation)

}
