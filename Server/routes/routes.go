package routes

import (
	"github.com/PPEACH21/MebleBackend-Web/controllers"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/gofiber/fiber/v2"
)

func Routes(app *fiber.App) {
	app.Get("/profile", middlewares.Profile)
	app.Get("/getShop", controllers.GetShop)
	app.Put("/setLocation/:ID", controllers.SetLocation)
	app.Post("/addMenu", controllers.AddMenu)
	app.Get("/menus", controllers.GetMenus)

}
