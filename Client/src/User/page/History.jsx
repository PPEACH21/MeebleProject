// src/User/page/History.jsx
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";
import { useNavigate } from "react-router-dom";   
import "@css/pages/History.css";

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

const getStoreName = (o) =>
  o.shop_name || o.storeName || o.shopName || o.vendorName || o.store?.name || o.shop?.name || "ร้านไม่ระบุ";
const getOrderId = (o) => o.orderId || o.order_id || o.id || "—";

// ---------- main component ----------
export default function History() {
  const { auth } = useContext(AuthContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // ✅ ดึงข้อมูลจาก backend (ใหม่)
  const fetchOrders = useCallback(async () => {
    if (!auth?.user_id) {
      setOrders([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      // ✅ ใช้ API /orders?userId=
      const res = await axios.get(`/orders`, {
        params: { userId: auth.user_id },
        withCredentials: true,
      });
      const data = Array.isArray(res.data) ? res.data : [];
      data.sort(
        (a, b) =>
          (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0)
      );
      setOrders(data);
    } catch (e) {
      console.error("โหลดประวัติล้มเหลว:", e);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [auth?.user_id]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // แบ่งกลุ่ม order ตามสถานะ
  const { processOrders, successOrders } = useMemo(() => {
    const process = [], success = [];
    for (const o of orders) {
      const st = String(o.status || "").trim().toLowerCase();
      if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(st))
        success.push(o);
      else process.push(o);
    }
    return { processOrders: process, successOrders: success };
  }, [orders]);

  // ---------- Card ----------
  const OrderCard = ({ order, type }) => {
    const st = String(order.status || "").trim().toLowerCase();
    const isOngoing = ["ongoing", "on-going", "prepare", "preparing", "กำลังจัดส่ง"].includes(st);

    const chipClass =
      type === "success"
        ? "his-chip--success"
        : isOngoing
        ? "his-chip--ongoing"
        : "his-chip--process";

    const chipText =
      type === "success"
        ? "สำเร็จ"
        : isOngoing
        ? "กำลังจัดส่ง"
        : "ดำเนินการ";

    const docId = order.id;
    const isClickable = !!docId;

    return (
      <div
        className="his-card"
        role="button"
        onClick={() => isClickable && navigate(`/orders/${encodeURIComponent(docId)}`)} // ✅ ไปหน้า Order Detail
        style={{
          cursor: isClickable ? "pointer" : "not-allowed",
          opacity: isClickable ? 1 : 0.6,
        }}
        title={isClickable ? "ดูรายละเอียดคำสั่งซื้อ" : "ไม่มีรหัสเอกสาร"}
      >
        <div className="his-card__left">
          <div className="his-field">
            <div className="his-label">Order ID</div>
            <div className="his-value">{getOrderId(order)}</div>
          </div>
          <div className="his-field">
            <div className="his-label">Date</div>
            <div className="his-value">{formatThaiBuddhist(order.createdAt)}</div>
          </div>
          <div className="his-field">
            <div className="his-label">Store</div>
            <div className="his-value">{getStoreName(order)}</div>
          </div>
        </div>
        <div className={`his-chip ${chipClass}`}>{chipText}</div>
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <div className="his-wrap">
      <div className="his-container">
        <h1 className="his-title">History</h1>

        {loading ? (
          <p className="his-loading">กำลังโหลด…</p>
        ) : (
          <div className="his-sections">
            {/* PROCESS */}
            <section>
              <h2 className="his-section-title his-section-title--process">กำลังดำเนินการ</h2>
              {processOrders.length ? (
                <div className="his-grid">
                  {processOrders.map((o) => (
                    <OrderCard key={o.id} order={o} type="process" />
                  ))}
                </div>
              ) : (
                <div className="his-empty">ไม่มีคำสั่งซื้อที่กำลังดำเนินการ</div>
              )}
            </section>

            {/* SUCCESS */}
            <section>
              <h2 className="his-section-title his-section-title--success">สำเร็จแล้ว</h2>
              {successOrders.length ? (
                <div className="his-grid">
                  {successOrders.map((o) => (
                    <OrderCard key={o.id} order={o} type="success" />
                  ))}
                </div>
              ) : (
                <div className="his-empty">ยังไม่มีคำสั่งซื้อสำเร็จ</div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
