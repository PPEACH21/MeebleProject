package middlewares

import (
	"os"

	jwtware "github.com/gofiber/contrib/jwt"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)


func ProtectedCookie() fiber.Handler {
	return jwtware.New(jwtware.Config{
		SigningKey:   jwtware.SigningKey{Key: []byte(os.Getenv("JWT_SECRET"))},
		TokenLookup:  "cookie:token",
		ErrorHandler: jwtError,
	})
}

func Profile(c *fiber.Ctx) error {
    user := c.Locals("user").(*jwt.Token)
    claims := user.Claims.(jwt.MapClaims)

    return c.JSON(fiber.Map{
		"email": claims["email"],
		"verified": claims["verified"],
		"user_id": claims["user_id"],  
        "username": claims["username"],
        "role": claims["role"],
    })
}


func jwtError(c *fiber.Ctx, err error) error {
	return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
		"error": "Unauthorized",
	})
}