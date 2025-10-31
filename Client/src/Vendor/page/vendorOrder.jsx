import { useEffect, useState } from "react";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";
import "@css/pages/VendorOrders.css";

// ---------- helpers ----------
const toDate = (v) => {
  if (!v) return null;
  if (typeof v === "object" && ("seconds" in v || "_seconds" in v)) {
    const s = v.seconds ?? v._seconds;
    return new Date(s * 1000);
  }
  return new Date(v);
};

const formatThaiBuddhist = (v) => {
  const d = toDate(v);
  if (!d || isNaN(+d)) return "-";
  return new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

// ---------- main ----------
export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // 🧩 เปลี่ยนเป็นค่าจาก context ได้ภายหลัง (ตอนนี้ใส่ mock ไว้ก่อน)
  const shopId = "9WRq2etVYWSISP1pJUAS";

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // ✅ LOG 1: ตรวจค่า shopId ก่อนยิง request
        console.log("🛍️ [VendorOrders] shopId ที่จะใช้ดึงข้อมูล:", shopId);

        const res = await axios.get("/orders/shop", {
          params: { shopId },
          withCredentials: true,
        });

        // ✅ LOG 2: ตรวจข้อมูลที่ backend ส่งกลับมา
        console.log("📦 [VendorOrders] Response จาก backend:", res.data);

        const data = Array.isArray(res.data) ? res.data : [];
        setOrders(data);
      } catch (e) {
        // ✅ LOG 3: ถ้ามี error ให้แสดงรายละเอียดเต็ม
        console.error(
          "❌ [VendorOrders] โหลดออเดอร์ร้านล้มเหลว:",
          e.response?.data || e.message
        );
        setOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [shopId]);

  // ---------- component ----------
  const OrderCard = ({ order }) => {
    const st = String(order.status || "").trim().toLowerCase();
    const isOngoing = ["ongoing", "on-going", "กำลังจัดส่ง"].includes(st);
    const isSuccess = ["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(st);

    const chipClass = isSuccess
      ? "v-chip--success"
      : isOngoing
      ? "v-chip--ongoing"
      : "v-chip--prepare";

    const chipText = isSuccess
      ? "สำเร็จ"
      : isOngoing
      ? "กำลังจัดส่ง"
      : "กำลังเตรียม";

    return (
      <div
        className="v-card"
        role="button"
        onClick={() => navigate(`/vendor/orders/${encodeURIComponent(order.id)}`)}
        title="ดูรายละเอียดออเดอร์"
      >
        <div className="v-card__left">
          <div className="v-field">
            <div className="v-label">Order ID</div>
            <div className="v-value">{order.orderId || order.id}</div>
          </div>
          <div className="v-field">
            <div className="v-label">ลูกค้า</div>
            <div className="v-value">
              {order.raw?.customerName || order.customerName || "ไม่ระบุ"}
            </div>
          </div>
          <div className="v-field">
            <div className="v-label">วันที่</div>
            <div className="v-value">{formatThaiBuddhist(order.createdAt)}</div>
          </div>
        </div>
        <div className={`v-chip ${chipClass}`}>{chipText}</div>
      </div>
    );
  };

  // ---------- render ----------
  return (
    <div className="v-wrap">
      <div className="v-container">
        <h1 className="v-title">ออเดอร์ทั้งหมดของร้าน</h1>

        {loading ? (
          <p className="v-loading">กำลังโหลดข้อมูลจากเซิร์ฟเวอร์…</p>
        ) : orders.length === 0 ? (
          <p className="v-empty">ยังไม่มีออเดอร์ในระบบ</p>
        ) : (
          <div className="v-grid">
            {orders.map((o) => (
              <OrderCard key={o.id} order={o} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
