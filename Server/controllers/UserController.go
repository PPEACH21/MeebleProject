package controllers

import (
	"fmt"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/PPEACH21/MebleBackend-Web/config"
	"github.com/PPEACH21/MebleBackend-Web/models"
	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
	"google.golang.org/api/iterator"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func GetShop(c *fiber.Ctx) error {
	ctx := config.Ctx
	col := config.Client.Collection("shops")

	snaps, err := col.Documents(ctx).GetAll()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to fetch shops",
			"msg":   err.Error(),
		})
	}

	// ส่ง map ตรง ๆ เพื่อรักษาคีย์ทั้งหมดให้ตรง Firestore (min_price, max_price จะติดมาด้วย)
	out := make([]map[string]interface{}, 0, len(snaps))
	for _, s := range snaps {
		m := s.Data()
		// แนบ id เผื่อ doc ไม่มีฟิลด์ id
		if _, ok := m["id"]; !ok {
			m["id"] = s.Ref.ID
		}
		out = append(out, m)
	}

	return c.JSON(out)
}

func VerifiedUser(c *fiber.Ctx) error {
	userId := c.Params("id")
	// fmt.Println("User: ", userId)

	data := config.User.Doc(userId)
	docRef, err := data.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
	}

	_, err = docRef.Ref.Update(config.Ctx, []firestore.Update{
		{
			Path:  "verified",
			Value: true,
		},
	})
	if err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("Update data Error")
	}

	var member models.User
	if err := docRef.DataTo(&member); err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Error parsing user data")
	}

	userData, err := docRef.Ref.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).SendString("Failed to fetch updated user")
	}

	c.ClearCookie("token")
	var updatedUser models.User
	userData.DataTo(&updatedUser)

	claims := jwt.MapClaims{
		"user_id":  userData.Ref.ID,
		"email":    updatedUser.Email,
		"username": updatedUser.Username,
		"verified": updatedUser.Verified,
		"role":     "user",
		"exp":      time.Now().Add(time.Minute * 60).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	t, err := token.SignedString([]byte(secret))
	if err != nil {
		return c.SendStatus(fiber.StatusInternalServerError)
	}

	c.Cookie(&fiber.Cookie{
		Name:     "token",
		Value:    t,
		Expires:  time.Now().Add(time.Minute * 60),
		HTTPOnly: false,
		// Secure:   false,
		// SameSite: "Strict",
	})

	return c.Status(fiber.StatusAccepted).SendString("Update data Success")
}

func UserProfile(c *fiber.Ctx) error {
	userID := c.Params("id")

	fmt.Println("User: ", userID)
	data := config.User.Doc(userID)
	docRef, err := data.Get(config.Ctx)
	if err != nil {
		data = config.Vendor.Doc(userID)
		docRef, err = data.Get(config.Ctx)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).SendString("Not user ID")
		}
	}

	userData := docRef.Data()
	if userData == nil {
		return c.Status(fiber.StatusNotFound).SendString("User not found")
	}
	return c.Status(fiber.StatusOK).JSON(userData)
}

func GetUserHistory(c *fiber.Ctx) error {
	userId := c.Params("userId")
	if userId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing userId"})
	}

	col := config.Client.Collection("users").Doc(userId).Collection("history")

	// ----------- Query Options -----------
	limit := 50
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			if n > 200 {
				n = 200 // จำกัดสูงสุด 200
			}
			limit = n
		}
	}

	// ✅ เริ่มจาก query แทน collectionRef
	query := col.Query

	// --- Filter ตามสถานะ (optional) ---
	if s := strings.TrimSpace(c.Query("status")); s != "" {
		query = query.Where("status", "==", s)
	}

	// --- เรียงจาก createdAt ล่าสุดก่อน ---
	query = query.OrderBy("createdAt", firestore.Desc).Limit(limit)

	// --- Pagination (optional): startAfter=timestamp (milliseconds) ---
	if sa := strings.TrimSpace(c.Query("startAfter")); sa != "" {
		if ms, err := strconv.ParseInt(sa, 10, 64); err == nil && ms > 0 {
			query = query.StartAfter(time.UnixMilli(ms))
		}
	}

	// ----------- Fetch Documents -----------
	iter := query.Documents(config.Ctx)
	defer iter.Stop()

	var history []map[string]interface{}
	for {
		doc, err := iter.Next()
		if err == iterator.Done {
			break
		}
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": err.Error()})
		}

		d := doc.Data()

		// ✅ ส่งเฉพาะ field ที่ UI ใช้
		out := map[string]interface{}{
			"id":        doc.Ref.ID,
			"orderId":   d["orderId"],
			"shop_name": d["shop_name"],
			"createdAt": d["createdAt"],
			"status":    d["status"],
			"total":     d["total"], // เพิ่มยอดรวมให้ด้วย เผื่อแสดงใน History
		}

		history = append(history, out)
	}

	return c.JSON(history)
}

func GetUserHistoryByID(c *fiber.Ctx) error {
	userId := c.Params("userId")
	historyId := c.Params("historyId")

	if userId == "" || historyId == "" {
		return c.Status(400).JSON(fiber.Map{"error": "missing userId or historyId"})
	}

	col := config.Client.Collection("users").Doc(userId).Collection("history")

	// ---------- 1. ลองค้นด้วย Document ID ตรง ๆ ----------
	doc, err := col.Doc(historyId).Get(config.Ctx)
	if err == nil && doc.Exists() {
		data := doc.Data()
		data["id"] = doc.Ref.ID
		return c.JSON(data)
	}

	// ---------- 2. ถ้าไม่เจอ → ลองค้นด้วย orderId ----------
	iter := col.Where("orderId", "==", historyId).Limit(1).Documents(config.Ctx)
	defer iter.Stop()

	d, err := iter.Next()
	if err == iterator.Done {
		return c.Status(404).JSON(fiber.Map{"error": "history not found"})
	}
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": err.Error()})
	}

	data := d.Data()
	data["id"] = d.Ref.ID
	return c.JSON(data)
}

// ---------- helper ----------
func getString(m map[string]interface{}, keys ...string) string {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			if s, ok := v.(string); ok && strings.TrimSpace(s) != "" {
				return s
			}
		}
	}
	return ""
}

func getTimeLike(m map[string]interface{}, keys ...string) time.Time {
	for _, k := range keys {
		if v, ok := m[k]; ok && v != nil {
			switch t := v.(type) {
			case time.Time:
				return t
			case *time.Time:
				if t != nil {
					return *t
				}
			case map[string]interface{}:
				// Firestore บาง client แปลง timestamp เป็น map["_seconds": ...]
				if sec, ok := t["_seconds"]; ok {
					if s, ok := sec.(int64); ok {
						return time.Unix(s, 0)
					}
					if s, ok := sec.(float64); ok {
						return time.Unix(int64(s), 0)
					}
				}
			}
		}
	}
	return time.Time{}
}

func normalizeOrder(docID string, data map[string]interface{}) models.OrderDTO {
	return models.OrderDTO{
		ID:        docID,
		OrderID:   getString(data, "orderId", "order_id", "id"),
		ShopName:  getString(data, "shop_name", "shopName", "storeName", "vendorName"),
		Status:    getString(data, "status"),
		CreatedAt: getTimeLike(data, "createdAt", "created_at", "time", "orderedAt"),
		Raw:       data,
	}
}

// ---------- main ----------
func ListOrdersByUser(c *fiber.Ctx) error {
	userId := strings.TrimSpace(c.Query("userId"))
	if userId == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "userId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	// ✅ ไม่มี OrderBy เพื่อหลีกเลี่ยงการสร้าง composite index
	q := db.Collection("orders").Where("userId", "==", userId).Limit(200)

	snaps, err := q.Documents(ctx).GetAll()
	if err != nil {
		fmt.Println("❌ Firestore error:", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	orders := make([]models.OrderDTO, 0, len(snaps))
	for _, d := range snaps {
		orders = append(orders, normalizeOrder(d.Ref.ID, d.Data()))
	}

	// ✅ sort ฝั่ง Go (แทนการใช้ OrderBy ใน Firestore)
	sort.Slice(orders, func(i, j int) bool {
		ti := getTimeLike(orders[i].Raw, "createdAt")
		tj := getTimeLike(orders[j].Raw, "createdAt")
		return ti.After(tj)
	})

	return c.JSON(orders)
}

// ---------- ดึงออเดอร์รายตัว ----------
func GetOrderByID(c *fiber.Ctx) error {
	orderID := strings.TrimSpace(c.Params("id"))
	if orderID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "orderId is required"})
	}

	ctx := config.Ctx
	db := config.Client

	doc, err := db.Collection("orders").Doc(orderID).Get(ctx)
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return c.Status(http.StatusNotFound).JSON(fiber.Map{"error": "order not found"})
		}
		fmt.Println("❌ Firestore error:", err)
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	data := doc.Data()
	data["id"] = doc.Ref.ID

	// ✅ ดึงชื่อจาก users โดยใช้ customerId
	var customerID string
	if cid, ok := data["customerId"].(string); ok && cid != "" {
		customerID = cid
	} else if raw, ok := data["raw"].(map[string]interface{}); ok {
		if cid, ok2 := raw["customerId"].(string); ok2 {
			customerID = cid
		}
	}

	if customerID != "" {
		fmt.Println("🔍 [GetOrderByID] Found customerId:", customerID)
		userDoc, err := db.Collection("users").Doc(customerID).Get(ctx)
		if err != nil {
			fmt.Println("⚠️ Error getting user:", err)
		} else if userDoc.Exists() {
			userData := userDoc.Data()

			// ✅ ใช้ field "username" จาก Firestore
			if uname, ok := userData["username"].(string); ok {
				data["customerName"] = uname
				fmt.Printf("✅ ใช้ username: %s\n", uname)
			} else {
				fmt.Println("⚠️ ไม่มี field 'username' ใน user doc")
				data["customerName"] = "ไม่ระบุชื่อผู้ใช้"
			}
		} else {
			fmt.Println("⚠️ ไม่พบ user doc:", customerID)
			data["customerName"] = "ไม่พบข้อมูลผู้ใช้"
		}
	} else {
		data["customerName"] = "ไม่มี customerId"
	}

	return c.JSON(data)
}
func UpdateProfile(c *fiber.Ctx) error {
	userID := c.Params("id")

	var newdata models.User
	if err := c.BodyParser(&newdata); err != nil {
		return c.Status(fiber.StatusBadRequest).SendString("cannot parse JSON")
	}

	docRef := config.User.Doc(userID)
	docSnap, err := docRef.Get(config.Ctx)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "user not found",
		})
	}

	var dbuser models.User
	if err := docSnap.DataTo(&dbuser); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to parse existing data",
		})
	}

	updateData := make(map[string]interface{})
	if newdata.Firstname != "" && newdata.Firstname != dbuser.Firstname {
		updateData["firstname"] = newdata.Firstname
	}
	if newdata.Lastname != "" && newdata.Lastname != dbuser.Lastname {
		updateData["lastname"] = newdata.Lastname
	}
	if newdata.Phone != "" && newdata.Phone != dbuser.Phone {
		updateData["phone"] = newdata.Phone
	}
	if newdata.Avatar != "" && newdata.Avatar != dbuser.Avatar {
		updateData["avatar"] = newdata.Avatar
	}

	// ถ้าไม่มีอะไรเปลี่ยน ไม่ต้องอัปเดต
	if len(updateData) == 0 {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"message": "no changes detected",
			"user":    dbuser,
		})
	}

	_, err = docRef.Set(config.Ctx, updateData, firestore.MergeAll)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "failed to update user",
		})
	}

	for key, val := range updateData {
		switch key {
		case "Firstname":
			dbuser.Firstname = val.(string)
		case "Lastname":
			dbuser.Lastname = val.(string)
		}
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"message": "profile updated successfully",
		"user":    dbuser,
	})
}

// POST /api/user/:id/cost/topup
// เติม Coin แบบ "บวกเพิ่ม" ด้วย Firestore Increment (atomic)
func TopUpUserCoin(c *fiber.Ctx) error {
	userID := c.Params("id")
	if userID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "user id required"})
	}

	var body models.TopUpRequest
	if err := c.BodyParser(&body); err != nil {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "invalid body"})
	}
	if body.Amount <= 0 {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "amount must be > 0"})
	}

	doc := config.Client.Collection("users").Doc(userID)

	// บวกเพิ่มแบบ atomic
	_, err := doc.Update(config.Ctx, []firestore.Update{
		{Path: "Cost", Value: firestore.Increment(body.Amount)},
		{Path: "updatedAt", Value: firestore.ServerTimestamp},
	})
	if err != nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "top-up failed", "msg": err.Error()})
	}

	// อ่านค่าล่าสุดเพื่อตอบกลับเป็น model.User
	snap, err := doc.Get(config.Ctx)
	if err != nil || !snap.Exists() {
		return c.Status(http.StatusOK).JSON(fiber.Map{
			"success": true,
			"userId":  userID,
			"message": "topped up, but failed to fetch new value",
		})
	}

	return c.JSON(fiber.Map{
		"success": true,
	})
}
func GetReservationsByUser(c *fiber.Ctx) error {
	userID := c.Params("id") // ใช้ :id ตาม route ของคุณ
	date := c.Query("date")  // optional filter: /reservations/user/:id?date=YYYY-MM-DD

	if userID == "" {
		return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "userId required"})
	}
	if config.Client == nil {
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{"error": "firestore client not initialized"})
	}

	q := config.Client.Collection("reservations").Where("userId", "==", userID)
	if date != "" {
		if !validateYMD(date) {
			return c.Status(http.StatusBadRequest).JSON(fiber.Map{"error": "date must be YYYY-MM-DD"})
		}
		q = q.Where("date", "==", date)
	}

	docs, err := q.Documents(config.Ctx).GetAll()
	if err != nil {
		// ถ้าเป็น index error ของ Firestore จะได้ FAILED_PRECONDITION
		// แนะนำดู log server จะมีลิงก์สร้าง index ให้
		return c.Status(http.StatusInternalServerError).JSON(fiber.Map{
			"error": "query failed",
			"msg":   err.Error(),
		})
	}

	out := make([]map[string]interface{}, 0, len(docs))
	for _, d := range docs {
		m := d.Data()
		m["id"] = d.Ref.ID
		out = append(out, m)
	}
	return c.JSON(out)
}
