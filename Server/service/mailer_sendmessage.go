package service

import (
	"log"

	"gopkg.in/gomail.v2"

	"github.com/PPEACH21/MebleBackend-Web/config"
)

type Mailer struct{}

func (m *Mailer) Send(message *gomail.Message) {
	message.SetHeader("From", "MEEBLE-PROJECT <meebleproject1709@gmail.com>")

	if err := config.Mailer.DialAndSend(message); err != nil {
		log.Println("[Mailer] ", err)
	}
}

func OTPvertify(){
	m := Mailer{}
	message := gomail.NewMessage()
	message.SetHeader("To", "peerapat.sae@ku.th")
	message.SetHeader("Subject", "OTP for E-mail Address Verification on MEEBLE!")

	message.SetBody("text/html", `
    <div style="font-family: Arial, sans-serif; color:#333;">
        <p>ถึงคุณ :,</p>
        <p>นี่คือรหัสยืนยันตัวตน (OTP) ของคุณ:</p>
        <h1 style="color:#FFA467; letter-spacing:5px;"> 32232 </h1>
        <p>รหัสนี้มีอายุการใช้งาน <b>5 นาที</b> กรุณาใช้เพื่อทำการยืนยันตัวตนภายในเวลาที่กำหนด</p>
        <br>
        <p>ขอบคุณที่ใช้บริการ Meeble 🙏</p>
    </div>`)
	m.Send(message)
}