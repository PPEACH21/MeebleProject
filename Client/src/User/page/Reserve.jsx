// src/User/page/Reserve.jsx
import { useEffect, useState, useContext, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";

// ใช้วันที่ตามเวลาเครื่อง (หลีกเลี่ยง UTC เพี้ยนวัน)
const todayLocal = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// helper: จำแนกข้อความ 409 จาก backend เดิม
const classify409 = (rawMsg = "") => {
  const msg = rawMsg.toString();
  if (/this shop is already reserved/i.test(msg) || /ถูกจองไปแล้ว/.test(msg)) {
    return "shop-day-taken"; // วันนั้นมีคนอื่นจองแล้ว
  }
  if (
    /reservation.*user.*shop.*date/i.test(msg) ||
    /คุณได้จองร้านนี้ในวันนี้ไว้แล้ว/.test(msg)
  ) {
    return "user-duplicate"; // ผู้ใช้คนเดิมจองซ้ำ
  }
  return "unknown";
};

export default function Reserve() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const { id: shopIdParam } = useParams();

  const navState = location.state || {};
  const shopId =
    shopIdParam || navState.shopId || localStorage.getItem("currentShopId") || "";
  const [shopName, setShopName] = useState(
    navState.shop?.shop_name || navState.shop?.name || ""
  );
  const [date, setDate] = useState(
    navState.date ||
      JSON.parse(localStorage.getItem("latestReserve") || "{}").date ||
      todayLocal()
  );
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // ป้องกันจองซ้ำ (ฝั่ง client — จองทับตัวเอง)
  const [alreadyReserved, setAlreadyReserved] = useState(false);
  const userId = auth?.user_id || "";

  // key สำหรับ local lock
  const lockKey = useMemo(() => {
    if (!shopId || !userId || !date) return "";
    return `reserve_lock_${shopId}_${userId}_${date}`;
  }, [shopId, userId, date]);

  // โหลดชื่อร้าน (ถ้ายังไม่มี)
  useEffect(() => {
    if (!shopName && shopId) {
      axios
        .get(`/shops/${shopId}`, { withCredentials: true })
        .then((res) => {
          const s = res.data || {};
          setShopName(s.shop_name || s.name || "");
        })
        .catch(() => {});
    }
  }, [shopId, shopName]);

  // เช็คจองซ้ำจากเซิร์ฟเวอร์ตาม (user, date) แล้วกรอง shopId ฝั่ง client (กันจองทับตัวเอง)
  useEffect(() => {
    const checkDup = async () => {
      if (!userId || !date) {
        setAlreadyReserved(false);
        return;
      }
      try {
        const res = await axios.get(`/reservations/user/${userId}`, {
          params: { date },
          withCredentials: true,
        });
        const list = Array.isArray(res.data) ? res.data : [];
        const hasSameShop = list.some((r) => (r.shopId || r.shopID) === shopId);
        setAlreadyReserved(!!hasSameShop);
      } catch {
        // ถ้าเช็คไม่สำเร็จ ไม่บล็อคผู้ใช้ไว้ ให้ backend จัดการตอน submit
        setAlreadyReserved(false);
      }
    };
    checkDup();
  }, [userId, shopId, date]);

  // เช็ค local lock (ป้องกันดับเบิลคลิก/กดซ้ำเร็วๆ)
  useEffect(() => {
    if (!lockKey) return;
    const raw = localStorage.getItem(lockKey);
    if (!raw) return;
    try {
      const obj = JSON.parse(raw);
      // หมดอายุใน 120 วินาที
      const expired = Date.now() - (obj.ts || 0) > 120000;
      if (expired) {
        localStorage.removeItem(lockKey);
      }
    } catch {
      localStorage.removeItem(lockKey);
    }
  }, [lockKey]);

  const setLocalLock = () => {
    if (!lockKey) return;
    localStorage.setItem(lockKey, JSON.stringify({ ts: Date.now() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!auth?.user_id) {
      Swal.fire("ต้องเข้าสู่ระบบ", "กรุณาเข้าสู่ระบบก่อนทำการจอง", "warning");
      return;
    }
    if (!shopId || !date) {
      Swal.fire("ข้อมูลไม่ครบ", "กรุณาเลือกวันที่ให้เรียบร้อย", "warning");
      return;
    }

    // กันซ้ำอีกชั้นก่อนยิง (ทั้ง local lock และ flag จาก server-check)
    if (alreadyReserved) {
      Swal.fire(
        "คุณจองวันนี้ไว้แล้ว",
        "ระบบพบว่าคุณมีการจองร้านนี้ในวันที่เลือกอยู่แล้ว",
        "info"
      );
      return;
    }

    // กันดับเบิลคลิกเฉพาะหน้าเครื่อง
    if (lockKey && localStorage.getItem(lockKey)) {
      Swal.fire("การจองกำลังดำเนินการ", "โปรดลองอีกครั้งภายหลังเล็กน้อย", "info");
      return;
    }

    try {
      setSubmitting(true);
      setLocalLock(); // วาง lock ก่อนยิง
      await axios.post(
        `/reservations`,
        {
          shopId: shopId,
          userId: auth.user_id,
          customerId: auth.user_id,
          date,
          note,
          phone,
        },
        { withCredentials: true }
      );

      // เคลียร์ latestReserve (optional)
      localStorage.removeItem("latestReserve");

      await Swal.fire(
        "จองสำเร็จ 🎉",
        `ร้าน: ${shopName || shopId}\nวันที่: ${date}`,
        "success"
      );

      // กลับหน้า Home
      navigate(`/home`);
    } catch (err) {
      const status = err?.response?.status;
      const msg = (err?.response?.data?.error || err?.message || "").toString();

      if (status === 409) {
        // แยกข้อความจาก error ของ backend เดิม
        const reason = classify409(msg);
        if (reason === "shop-day-taken") {
          Swal.fire("ถูกจองไปแล้ว", "วันดังกล่าวมีผู้จองร้านนี้แล้ว โปรดเลือกวันอื่น", "info");
          return;
        }
        if (reason === "user-duplicate") {
          setAlreadyReserved(true);
          Swal.fire("จองซ้ำวันเดียวกัน", "คุณได้จองร้านนี้ในวันนี้ไว้แล้ว", "info");
          return;
        }
        Swal.fire("ไม่ว่าง", "วันดังกล่าวไม่ว่าง หรือมีการจองซ้ำ", "info");
      } else if (status === 500) {
        // ตามที่ขอ: ถ้า backend ส่ง 500 ให้แจ้งว่า "วันนี้คุณจองไปแล้ว"
        setAlreadyReserved(true);
        Swal.fire("วันนี้คุณจองไปแล้ว", "ระบบตรวจพบการจองวันนี้อยู่แล้ว", "info");
      } else {
        Swal.fire("จองไม่สำเร็จ", msg || "unknown error", "error");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", padding: "20px" }}>
      <div
        style={{
          width: "min(680px, 96vw)",
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 16,
        }}
      >
        <h2 style={{ marginTop: 0 }}>จองร้าน</h2>

        <div style={{ marginBottom: 12 }}>
          <div>
            <b>ร้าน:</b>{" "}
            {shopName || (
              <span style={{ color: "#6b7280" }}>(กำลังโหลดหรือไม่พบชื่อร้าน)</span>
            )}
          </div>
          <div>
            <b>Shop ID:</b>{" "}
            <span style={{ fontFamily: "monospace" }}>{shopId}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            style={{ display: "block", fontWeight: 700, margin: "10px 0 6px" }}
          >
            เลือกวันที่
          </label>
          <input
            type="date"
            value={date}
            min={todayLocal()}
            onChange={(e) => setDate(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
            required
          />
          {alreadyReserved && (
            <p style={{ marginTop: 8, color: "#b91c1c" }}>
              * คุณได้จองร้านนี้ในวันที่เลือกไว้แล้ว
            </p>
          )}

          <label
            style={{ display: "block", fontWeight: 700, margin: "14px 0 6px" }}
          >
            เบอร์ติดต่อ (ถ้ามี)
          </label>
          <input
            type="tel"
            placeholder="เช่น 08x-xxx-xxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
            }}
          />

          <label
            style={{ display: "block", fontWeight: 700, margin: "14px 0 6px" }}
          >
            หมายเหตุ
          </label>
          <textarea
            rows={3}
            placeholder="เช่น ต้องการรับช่วงบ่าย"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e5e7eb",
              resize: "vertical",
            }}
          />

          <div
            style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                border: "1px solid #e5e7eb",
                background: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                cursor: "pointer",
              }}
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || alreadyReserved}
              style={{
                border: "none",
                background: submitting || alreadyReserved ? "#6b7280" : "#111827",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor: submitting || alreadyReserved ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
              title={alreadyReserved ? "คุณจองวันนี้ไว้แล้ว" : "ยืนยันการจอง"}
            >
              {submitting
                ? "กำลังจอง..."
                : alreadyReserved
                ? "จองซ้ำไม่ได้"
                : "ยืนยันการจอง"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
