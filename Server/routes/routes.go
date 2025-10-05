package routes

import (
	"github.com/PPEACH21/MebleBackend-Web/controllers"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/service"
	"github.com/gofiber/fiber/v2"
)

func Routes(app *fiber.App) {
	app.Get("/profile", middlewares.Profile)
	app.Get("/getShop", controllers.GetShop)
	app.Put("/user", controllers.GetShop)
	app.Put("/setLocation/:ID", controllers.SetLocation)
	app.Put("/verifiedEmail/:id", controllers.VerifiedUser)
	app.Post("/addMenu", controllers.AddMenu)
	app.Get("/menus", controllers.GetMenus)
	app.Post("/sendotp", service.OTPvertify())

}
