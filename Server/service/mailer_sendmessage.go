package service

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"

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

func generateNumericOTP(n int) (string, error) {
	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(n)), nil) // 10^n
	num, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", err
	}
	otp := fmt.Sprintf("%0*d", n, num.Int64())
	return otp, nil
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


func CheckEmail(c *fiber.Ctx)error{
	user := new(models.User)
	if err := c.BodyParser(user) ; err!=nil{
        return  c.Status(fiber.StatusBadRequest).SendString(err.Error())
	}

	_,err := config.User.Where("email", "==", user.Email).Limit(1).Documents(config.Ctx).Next()
	if err != nil{
		return c.Status(fiber.StatusNotFound).SendString("Email or Username Not Found")
    }
	
	return c.JSON(fiber.Map{
			"status":  "success",
			"message": "CheckEmail Success",
	})
}


func OTPrepassword()fiber.Handler{
	return func(c *fiber.Ctx)error{
	var body models.Request
	
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}
	fmt.Print("CHECK")
	if body.Email == "" {
	return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
		"error": "Email is required",
	})}
	
	_,err := config.User.Where("email", "==", body.Email).Limit(1).Documents(config.Ctx).Next()
	if err != nil {
		return c.Status(fiber.StatusNotFound).SendString("Email or Username Not Found")
    }

	otp, err := generateNumericOTP(6)
	if err != nil {
		log.Println("generate OTP error:", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Could not generate OTP",
		})
	}
	// m := Mailer{}
	// message := gomail.NewMessage()
	// message.SetHeader("To", body.Email)
	// message.SetHeader("Subject", "OTP for ChangePassword on MEEBLE!")

	// message.SetBody("text/html", fmt.Sprintf(`
	// <div style="font-family: Arial, sans-serif; color:#333;">
	// 	<p>ถึงคุณ,%s</p>
	// 	<p>นี่คือรหัสยืนยันตัวตน (OTP) ของคุณ:</p>
	// 	<h1 style="color:#FFA467; letter-spacing:5px;">%s</h1>
	// 	<p>รหัสนี้มีอายุการใช้งาน <b>5 นาที</b> กรุณาใช้เพื่อทำการยืนยันตัวตนภายในเวลาที่กำหนด</p>
	// 	<br>
	// 	<p>ขอบคุณที่ใช้บริการ Meeble 🙏</p>
	// </div>`,body.Email,body.Otp))
	// m.Send(message)

	return c.JSON(fiber.Map{
			"status":  "success",
			"message": "OTP email sent",
			"otp":     otp,
			"to":      body.Email,
	})
	}
}