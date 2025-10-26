package service

import "github.com/gofiber/fiber/v2"

func Logout(c *fiber.Ctx) error {
	c.ClearCookie("token") // หรือชื่อ cookie ที่ใช้เก็บ JWT
	return c.JSON(fiber.Map{"message": "logged out"})
}