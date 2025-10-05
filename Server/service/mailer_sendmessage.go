package service

import (
	"fmt"
	"log"

	"gopkg.in/gomail.v2"

	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
)

type Mailer struct{}

func (m *Mailer) Send(message *gomail.Message) {
	message.SetHeader("From", "MEEBLE-PROJECT <meebleproject1709@gmail.com>")

	if err := config.Mailer.DialAndSend(message); err != nil {
		log.Println("[Mailer] ", err)
	}
}

func OTPvertify()fiber.Handler {
	return func(c *fiber.Ctx)error{
	var body models.Request
	
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	m := Mailer{}
	message := gomail.NewMessage()
	message.SetHeader("To", body.Email)
	message.SetHeader("Subject", "OTP for E-mail Address Verification on MEEBLE!")

	message.SetBody("text/html", fmt.Sprintf(`
	<div style="font-family: Arial, sans-serif; color:#333;">
		<p>ถึงคุณ,%s</p>
		<p>นี่คือรหัสยืนยันตัวตน (OTP) ของคุณ:</p>
		<h1 style="color:#FFA467; letter-spacing:5px;">%s</h1>
		<p>รหัสนี้มีอายุการใช้งาน <b>5 นาที</b> กรุณาใช้เพื่อทำการยืนยันตัวตนภายในเวลาที่กำหนด</p>
		<br>
		<p>ขอบคุณที่ใช้บริการ Meeble 🙏</p>
	</div>`,body.Username,body.Otp))
	m.Send(message)

	return c.JSON(fiber.Map{
			"status":  "success",
			"message": "OTP email sent",
			"otp":     body.Otp,
			"to":      body.Email,
	})
	}
}