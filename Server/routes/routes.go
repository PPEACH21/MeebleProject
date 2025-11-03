package routes

import (
	"github.com/PPEACH21/MebleBackend-Web/controllers"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/service"
	"github.com/gofiber/fiber/v2"
)

func Routes(app *fiber.App) {
	//-----------------UserLogin---------------------------//
	app.Put("/verifiedEmail/:id", controllers.VerifiedUser)
	app.Post("/sendotp", service.OTPvertify())
	app.Post("/logout", service.Logout)
	//----------------------------------------------------//
	app.Put("/profile/:id", controllers.UpdateProfile)
	app.Get("/profile", middlewares.Profile)
	//----------------------------------------------------//
	app.Get("/Shop", controllers.GetShop)
	app.Post("/Shop", controllers.CreateShop)
	//----------------------------------------------------//
	//app.Get("/user/:id", controllers.UserProfile)
	app.Put("/setLocation/:ID", controllers.SetLocation)
	//----------------------------------------------------//
	app.Get("/shops/:shopId/menu", controllers.GetMenus)
	app.Post("/shops/:shopId/menu", controllers.AddMenu)
	//----------------------------------------------------//
	app.Get("/shops/by-vendor/:vendorId", controllers.GetShopByVendor)
	app.Patch("/shops/:shopId/menu/:menuId", controllers.UpdateMenu)
	app.Patch("/shops/:shopId/menu/:menuId/active", controllers.ToggleMenuActive)
	app.Delete("/shops/:shopId/menu/:menuId", controllers.DeleteMenu)
	//----------------------------------------------------//
	app.Get("/users/:userId/history", controllers.GetUserHistory)
	app.Get("/users/:userId/history/:historyId", controllers.GetUserHistoryByID)
	app.Put("/shops/:id/status", controllers.UpdateShopStatus)
	//----------------------------------------------------//
	app.Get("/api/cart", controllers.GetCart)
	app.Post("/api/cart/add", controllers.AddToCart)
	app.Post("/api/cart/checkout", controllers.CheckoutCartFromDB)
	app.Patch("/api/cart/qty", controllers.UpdateCartQty)
	//----------------------------------------------------//
	app.Get("/orders", controllers.ListOrdersByUser)
	app.Patch("/orders/:orderId/status", controllers.UpdateOrderStatus)
	app.Get("/api/shops/:shopId/history", controllers.ListShopHistory)
	app.Get("/api/shops/:shopId/history/:orderId", controllers.GetShopHistoryDoc)
	app.Get("/orders/shop", controllers.ListOrdersByShop)
	//----------------------------------------------------//
	app.Post("/user/:id/cost/topup", controllers.TopUpUserCoin)
	app.Get("/orders/customer/:id", controllers.GetUserNameCustomer)
	app.Get("/orders/:id", controllers.GetOrderByID)
	app.Put("/shops/:id", controllers.UpdateShopSettings)
	//----------------------------------------------------//
	//การจอง
	app.Get("/reservations/shop/:shopId", controllers.GetShopReservations)
	app.Get("/shops/:shopId/reservations", controllers.GetShopReservationsSub)
	app.Get("/reservations/user/:id", controllers.GetReservationsByUser)
	app.Post("/reservations", controllers.CreateReservation)
	app.Put("/shops/:id/reserve", controllers.UpdateReserveStatus)
	//----------------------------------------------------//
}
