package middlewares

import (
	"os"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
)


func GetJwt() fiber.Handler{
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "defaultsecret"
	}
	
	return jwtware.New(jwtware.Config{
		SigningKey: jwtware.SigningKey{Key: []byte(secret)},
	})
}