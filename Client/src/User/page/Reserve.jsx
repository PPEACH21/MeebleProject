// src/User/page/Reserve.jsx
import { useEffect, useState, useContext, useMemo } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "@/api/axios";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";
import { m } from "@/paraglide/messages.js";

const todayLocal = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

// จำแนกข้อความ 409 จาก backend เดิม
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
    shopIdParam ||
    navState.shopId ||
    localStorage.getItem("currentShopId") ||
    "";
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

  // ป้องกันจองซ้ำ(ฝั่งclient—จองทับตัวเอง)
  const [alreadyReserved, setAlreadyReserved] = useState(false);
  const userId = auth?.user_id || "";

  //keyสำหรับ local lock
  const lockKey = useMemo(() => {
    if (!shopId || !userId || !date) return "";
    return `reserve_lock_${shopId}_${userId}_${date}`;
  }, [shopId, userId, date]);

  //โหลดชื่อร้าน(ถ้ายังไม่มี)
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
      Swal.fire(m.MustLogin(), m.PleaseLogin(), "warning");
      return;
    }
    if (!shopId || !date) {
      Swal.fire(m.IncompleteInfo(), m.selectDate(), "warning");
      return;
    }

    // กันซ้ำอีกชั้นก่อนยิง (ทั้ง local lock และ flag จาก server-check)
    if (alreadyReserved) {
      Swal.fire(m.selectDateAlready(), m.systemDateAlready(), "info");
      return;
    }

    // กันดับเบิลคลิกเฉพาะหน้าเครื่อง
    if (lockKey && localStorage.getItem(lockKey)) {
      Swal.fire(m.processing(), m.tryagain(), "info");
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
        `${m.reserve()} ${m.success()}`,
        `${m.Restarant()}: ${shopName || shopId}\n${m.Date()}: ${date}`,
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
          Swal.fire(m.AlreadyBooked(), m.ShopDayTaken(), "info");
          return;
        }
        if (reason === "user-duplicate") {
          setAlreadyReserved(true);
          Swal.fire(m.DuplicateBooking(), m.UserDuplicate(), "info");
          return;
        }
        Swal.fire(m.NotAvailable(), m.NotAvailableDesc(), "info");
      } else if (status === 500) {
        setAlreadyReserved(true);
        Swal.fire(m.AlreadyBookedToday(), m.AlreadyBookedTodayDesc(), "info");
      } else {
        Swal.fire(m.ReserveFail(), msg || "unknown error", "error");
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
        <h2 style={{ marginTop: 0 }}>{m.reserve()}</h2>

        <div style={{ marginBottom: 12 }}>
          <div>
            <b>{m.Restarant()}:</b>{" "}
            {shopName || (
              <span style={{ color: "#6b7280" }}>{m.loading()}</span>
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
            {m.selectDate()}
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
              * {m.systemDateAlready()}
            </p>
          )}

          <label
            style={{ display: "block", fontWeight: 700, margin: "14px 0 6px" }}
          >
            {m.Phone()}
          </label>
          <input
            type="tel"
            placeholder="08x-xxx-xxxx"
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
            {m.Note()}
          </label>
          <textarea
            rows={3}
            placeholder={m.NotePlaceholder()}
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
            style={{
              display: "flex",
              gap: 10,
              justifyContent: "flex-end",
              marginTop: 16,
            }}
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
              {m.cancel()}
            </button>
            <button
              type="submit"
              disabled={submitting || alreadyReserved}
              style={{
                border: "none",
                background:
                  submitting || alreadyReserved ? "#6b7280" : "#111827",
                color: "#fff",
                borderRadius: 10,
                padding: "10px 14px",
                fontWeight: 700,
                cursor:
                  submitting || alreadyReserved ? "not-allowed" : "pointer",
                opacity: submitting ? 0.7 : 1,
              }}
              title={
                alreadyReserved ? m.selectDateAlready() : m.ConfirmReserve()
              }
            >
              {submitting
                ? m.processing()
                : alreadyReserved
                ? m.selectDateAlready()
                : m.ConfirmReserve()}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
