import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "@/api/axios";
import "@css/pages/HistoryDetail.css"; // ✅ ใช้ CSS เดิมได้เลย

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

const currency = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
  });

const getStatusGif = (status) => {
  const s = String(status || "").toLowerCase();

  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(s))
    return "https://media3.giphy.com/media/OaNtfLLzPq4I8/giphy.gif"; // 👨‍🍳 เตรียมของ

  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(s))
    return "https://media2.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif"; // 🚚 กำลังจัดส่ง

  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(s))
    return "https://media4.giphy.com/media/T70hpBP1L0N7U0jtkq/giphy.gif"; // ✅ สำเร็จแล้ว

  // default
  return "https://media3.giphy.com/media/OaNtfLLzPq4I8/giphy.gif";
};

// ---------- main ----------
export default function HistoryDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!id) return;
      try {
        // ✅ ดึงจาก /orders/:id (ไม่ต้องใช้ userId)
        const res = await axios.get(`/orders/${id}`, { withCredentials: true });
        setData(res.data);
      } catch (e) {
        console.error("โหลดรายละเอียดล้มเหลว:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading)
    return <p className="hisd-loading">กำลังโหลดข้อมูล…</p>;

  if (!data)
    return <p className="hisd-empty">ไม่พบคำสั่งซื้อ</p>;

  const items =
    Array.isArray(data.raw?.items) || Array.isArray(data.items)
      ? data.raw?.items || data.items
      : [];

  const total =
    data.total ||
    items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );

  // 🔹 ขั้นตอนสถานะ
  const st = String(data.status || "").trim().toLowerCase();
  const steps = ["กำลังจัดเตรียม", "กำลังจัดส่ง", "สำเร็จ"];
  let currentStep = 0;
  if (["prepare", "preparing"].includes(st)) currentStep = 0;
  else if (["ongoing", "on-going", "กำลังจัดส่ง"].includes(st))
    currentStep = 1;
  else if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(st))
    currentStep = 2;

  return (
    <div className="hisd-wrap">
      <div className="hisd-container">
        <h1 className="hisd-title">รายละเอียดการสั่งซื้อ</h1>

        <div className="status-gif-container">
          <img
            src={getStatusGif(data.status)}
            alt="order-status"
            className="status-gif"
          />
          <p className="status-text">สถานะปัจจุบัน: {steps[currentStep]}</p>
        </div>

        {/* 🧭 Tracking Progress */}
        <div className="tracking-bar">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`step ${idx <= currentStep ? "active" : ""}`}
            >
              <div className="dot" />
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* 🔹 ข้อมูลออเดอร์ */}
        <div className="hisd-card summary">
          <div className="row">
            <div>
              <p className="label">รหัสออเดอร์</p>
              <p>{data.orderId || data.id}</p>
            </div>
            <div>
              <p className="label">ร้าน</p>
              <p>{data.shop_name || "ร้านไม่ระบุ"}</p>
            </div>
            <div>
              <p className="label">วันที่</p>
              <p>{formatThaiBuddhist(data.createdAt)}</p>
            </div>
            <div>
              <p className="label">สถานะ</p>
              <p>{steps[currentStep]}</p>
            </div>
          </div>
        </div>

        {/* 🔹 รายการอาหาร */}
        <div className="hisd-card items">
          <h3>รายการอาหาร</h3>
          <div className="table">
            <div className="thead">
              <div>ชื่อเมนู</div>
              <div>จำนวน</div>
              <div>ราคา</div>
              <div>รวม</div>
            </div>
            <div className="tbody">
              {items.length ? (
                items.map((it, idx) => (
                  <div className="tr" key={idx}>
                    <div>{it.name || it.Name || `เมนูที่ ${idx + 1}`}</div>
                    <div>{it.qty || it.Qty}</div>
                    <div>{currency(it.price || it.Price)}</div>
                    <div>{currency((it.qty || it.Qty) * (it.price || it.Price))}</div>
                  </div>
                ))
              ) : (
                <div className="tr">
                  <div colSpan="4">ไม่มีรายการอาหาร</div>
                </div>
              )}
            </div>
          </div>

          <div className="total">
            <span>ยอดรวมทั้งหมด:</span>
            <strong>{currency(total)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
