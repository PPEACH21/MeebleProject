package middlewares

import (
	"os"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
)


func GetJwt() fiber.Handler{
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte("JWT_SECRET")},
	})
}


func GeteventEnv(c *fiber.Ctx)error{
	secret := os.Getenv("SECRET")
	if secret == ""{
		secret = "defaultsecret"
	}
	return c.JSON(fiber.Map{"SECRET": secret,})
}