package routes

import (
	"github.com/PPEACH21/MebleBackend-Web/controllers"
	"github.com/PPEACH21/MebleBackend-Web/middlewares"
	"github.com/PPEACH21/MebleBackend-Web/service"
	"github.com/gofiber/fiber/v2"
)

func Routes(app *fiber.App) {
	app.Put("/profile/:id", controllers.UpdateProfile)
	app.Get("/profile", middlewares.Profile)
	app.Get("/Shop", controllers.GetShop)
	app.Post("/Shop", controllers.CreateShop)
	app.Put("/setLocation/:ID", controllers.SetLocation)
	app.Get("/shops/:shopId/menu", controllers.GetMenus)
	app.Post("/shops/:shopId/menu", controllers.AddMenu)
	app.Get("/shops/by-vendor/:vendorId", controllers.GetShopByVendor)
	app.Patch("/shops/:shopId/menu/:menuId", controllers.UpdateMenu)
	app.Patch("/shops/:shopId/menu/:menuId/active", controllers.ToggleMenuActive)
	app.Delete("/shops/:shopId/menu/:menuId", controllers.DeleteMenu)

	// routes/routes.go
	app.Get("/users/:userId/history", controllers.GetUserHistory)
	app.Get("/users/:userId/history/:historyId", controllers.GetUserHistoryByID)
	app.Put("/shops/:id/status", controllers.UpdateShopStatus)
	app.Put("/shops/:id/reserve", controllers.UpdateReserveStatus)

	app.Put("/verifiedEmail/:id", controllers.VerifiedUser)
	app.Post("/sendotp", service.OTPvertify())

	app.Post("/logout", service.Logout)
	//
	app.Get("/api/cart", controllers.GetCart)
	app.Post("/api/cart/add", controllers.AddToCart)
	app.Post("/api/cart/checkout", controllers.CheckoutCartFromDB)
	app.Patch("/api/cart/qty", controllers.UpdateCartQty)
	app.Get("/orders", controllers.ListOrdersByUser)                    // ดึงทั้งหมดตาม userId
	app.Patch("/orders/:orderId/status", controllers.UpdateOrderStatus) // success → move
	app.Get("/api/shops/:shopId/history", controllers.ListShopHistory)  // ประวัติร้าน
	app.Get("/api/shops/:shopId/history/:orderId", controllers.GetShopHistoryDoc)
	app.Get("/orders/shop", controllers.ListOrdersByShop)
	// routes.go
	//app.Get("/shops/by-user/:userId", controllers.GetShopByUser)

	app.Get("/orders/customer/:id", controllers.GetUserNameCustomer)
	app.Get("/orders/:id", controllers.GetOrderByID) // ดึงรายละเอียดออเดอร์เดียว

}
