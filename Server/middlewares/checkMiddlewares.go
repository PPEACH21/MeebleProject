package middlewares

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)


func CheckMiddleware(c *fiber.Ctx) error {
	user,err := c.Locals("user").(*jwt.Token)
	if !err {
		return c.Status(fiber.StatusUnauthorized).SendString("Token Unauthorized");
	}

	claims := user.Claims.(jwt.MapClaims)
	fmt.Println(claims)
	// if claims["role"] != "admin" {
	// 	return fiber.ErrUnauthorized
	// }

	start := time.Now().In(time.FixedZone("UTC+7", 7*60*60))
	fmt.Printf("LOG : PATH= %s, Method= %s, Time=%s\n",c.OriginalURL(), c.Method(), start,)
	return c.Next()
}