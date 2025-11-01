import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import axios from "@/api/axios";
import "@css/pages/VendorOrderDetail.css";

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
    return "https://media3.giphy.com/media/OaNtfLLzPq4I8/giphy.gif";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(s))
    return "https://media2.giphy.com/media/cfuL5gqFDreXxkWQ4o/giphy.gif";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(s))
    return "https://media4.giphy.com/media/T70hpBP1L0N7U0jtkq/giphy.gif";
  return "https://media3.giphy.com/media/OaNtfLLzPq4I8/giphy.gif";
};

// ---------- เพิ่ม: ตัวช่วยทำให้สถานะเป็นรูปแบบเดียวกัน ----------
const canonicalStatus = (raw) => {
  const s = String(raw || "").trim().toLowerCase();
  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(s)) return "prepare";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(s))
    return "ongoing";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(s))
    return "success";
  // ดีฟอลต์ให้เป็น prepare
  return "prepare";
};

const statusLabelTH = {
  prepare: "กำลังจัดเตรียม",
  ongoing: "กำลังจัดส่ง",
  success: "สำเร็จ",
};

// เรียงลำดับสถานะ
const statusOrder = ["prepare", "ongoing", "success"];

export default function VendorOrderDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // ---------- เพิ่ม: state สำหรับกดอัปเดตสถานะ ----------
  const [updating, setUpdating] = useState(false);
  const currStatus = useMemo(
    () => canonicalStatus(data?.status),
    [data?.status]
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await axios.get(`/orders/${id}`, { withCredentials: true });
        setData(res.data);
      } catch (e) {
        console.error("❌ โหลดรายละเอียดออเดอร์ล้มเหลว:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  // ---------- เพิ่ม: ฟังก์ชันอัปเดตสถานะ ----------
  const updateStatus = async (newStatus) => {
    if (!id) return;
    if (newStatus === currStatus) return;

    try {
      setUpdating(true);

      // optimistic update
      setData((prev) => (prev ? { ...prev, status: newStatus } : prev));

      // เรียก API อัปเดตสถานะ (ให้แบ็กเอนด์ไปซิงก์ฝั่งลูกค้าด้วย)
      await axios.patch(
        `/orders/${id}/status`,
        { status: newStatus },
        { withCredentials: true }
      );

      // ถ้าอยากรีเฟรชจากเซิร์ฟเวอร์อีกครั้ง (กันกรณีราคา/ฟิลด์อื่นเปลี่ยน)
      // const fresh = await axios.get(`/orders/${id}`, { withCredentials: true });
      // setData(fresh.data);
    } catch (e) {
      console.error("❌ อัปเดตสถานะล้มเหลว:", e);
      // roll back ถ้าอยาก
      setData((prev) => (prev ? { ...prev, status: currStatus } : prev));
      alert("อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="v-detail-loading">กำลังโหลดข้อมูล…</p>;
  if (!data) return <p className="v-detail-empty">ไม่พบออเดอร์นี้</p>;

  const items = Array.isArray(data.items) ? data.items : [];
  const total =
    data.total ||
    items.reduce(
      (s, it) => s + (Number(it.qty) || 0) * (Number(it.price) || 0),
      0
    );

  const currentStep = Math.max(
    0,
    statusOrder.indexOf(canonicalStatus(data.status))
  );
  const stepsTH = statusOrder.map((k) => statusLabelTH[k]);

  return (
    <div className="v-detail-wrap">
      <div className="v-detail-container">
        <h1 className="v-detail-title">รายละเอียดออเดอร์ร้าน</h1>

        <div className="status-gif-container">
          <img
            src={getStatusGif(data.status)}
            alt="order-status"
            className="status-gif"
          />
          <p className="status-text">สถานะปัจจุบัน: {stepsTH[currentStep]}</p>
        </div>

        <div className="tracking-bar">
          {stepsTH.map((s, idx) => (
            <div
              key={idx}
              className={`step ${idx <= currentStep ? "active" : ""}`}
            >
              <div className="dot" />
              <span>{s}</span>
            </div>
          ))}
        </div>

        {/* ---------- เพิ่ม: ปุ่มอัปเดตสถานะ ---------- */}
        <div className="v-card status-actions">
          <h3>อัปเดตสถานะ</h3>
          <div className="status-buttons">
            <button
              className={`btn-status ${
                currStatus === "prepare" ? "active" : ""
              }`}
              disabled={updating || currStatus === "prepare"}
              onClick={() => updateStatus("prepare")}
            >
              {statusLabelTH.prepare}
            </button>
            <button
              className={`btn-status ${
                currStatus === "ongoing" ? "active" : ""
              }`}
              disabled={updating || currStatus === "ongoing"}
              onClick={() => updateStatus("ongoing")}
            >
              {statusLabelTH.ongoing}
            </button>
            <button
              className={`btn-status ${
                currStatus === "success" ? "active" : ""
              }`}
              disabled={updating || currStatus === "success"}
              onClick={() => updateStatus("success")}
            >
              {statusLabelTH.success}
            </button>
          </div>
          {updating && <p className="muted">กำลังอัปเดตสถานะ…</p>}
        </div>

        <div className="v-card summary">
          <div className="row">
            <div>
              <p className="label">Order ID</p>
              <p>{data.orderId || data.id}</p>
            </div>
            <div>
              <p className="label">ลูกค้า</p>
              <p>{data.customerName || "ไม่ระบุ"}{data.customerPhone ? ` (${data.customerPhone})` : ""}</p>
            </div>
            <div>
              <p className="label">วันที่</p>
              <p>{formatThaiBuddhist(data.createdAt)}</p>
            </div>
            <div>
              <p className="label">สถานะ</p>
              <p>{stepsTH[currentStep]}</p>
            </div>
          </div>
        </div>

        <div className="v-card items">
          <h3>รายการอาหาร</h3>
          <div className="table">
            <div className="thead">
              <div>ชื่อเมนู</div>
              <div>จำนวน</div>
              <div>ราคา</div>
              <div>รวม</div>
            </div>
            <div className="tbody">
              {items.map((it, idx) => (
                <div className="tr" key={idx}>
                  <div>{it.name || `เมนูที่ ${idx + 1}`}</div>
                  <div>{it.qty}</div>
                  <div>{currency(it.price)}</div>
                  <div>{currency((Number(it.qty)||0) * (Number(it.price)||0))}</div>
                </div>
              ))}
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
