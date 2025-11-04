// src/User/page/VendorOrderDetail.jsx
import { useParams } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import axios from "@/api/axios";
import "@css/pages/VendorOrderDetail.css";
import { m } from "@/paraglide/messages.js";

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

// ทำสถานะให้เป็นรูปแบบเดียวกัน
const canonicalStatus = (raw) => {
  const s = String(raw || "")
    .trim()
    .toLowerCase();
  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(s)) return "prepare";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(s))
    return "ongoing";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(s))
    return "success";
  return "prepare";
};

const statusOrder = ["prepare", "ongoing", "success"];

export default function VendorOrderDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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
        console.error("❌ load order detail failed:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const updateStatus = async (newStatus) => {
    if (!id) return;
    if (newStatus === currStatus) return;
    try {
      setUpdating(true);
      setData((prev) => (prev ? { ...prev, status: newStatus } : prev));
      await axios.patch(
        `/orders/${id}/status`,
        { status: newStatus },
        { withCredentials: true }
      );
    } catch (e) {
      console.error("❌ update status failed:", e);
      setData((prev) => (prev ? { ...prev, status: currStatus } : prev));
      alert(
        m.update_status_failed
          ? m.update_status_failed()
          : "อัปเดตสถานะไม่สำเร็จ กรุณาลองใหม่"
      );
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <p className="v-detail-loading">{m.loading_data()}</p>;
  if (!data) return <p className="v-detail-empty">{m.no_order_found()}</p>;

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
  const stepLabel = (k) =>
    k === "success"
      ? m.status_done()
      : k === "ongoing"
      ? m.status_shipping()
      : m.status_preparing();
  const steps = statusOrder.map(stepLabel);

  return (
    <div className="v-detail-wrap">
      <div className="v-detail-container">
        <h1 className="v-detail-title">{m.order_detail()}</h1>

        <div className="status-gif-container">
          <img
            src={getStatusGif(data.status)}
            alt="order-status"
            className="status-gif"
          />
          <p className="status-text">
            {m.current_status()}: {steps[currentStep]}
          </p>
        </div>

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

        {/* ปุ่มอัปเดตสถานะ */}
        <div className="v-card status-CP_actions">
          <h3>{m.update_status ? m.update_status() : "อัปเดตสถานะ"}</h3>
          <div className="status-buttons">
            <button
              className={`vdorder-btn-status ${
                currStatus === "prepare" ? "active" : ""
              }`}
              disabled={updating || currStatus === "prepare"}
              onClick={() => updateStatus("prepare")}
            >
              {m.status_preparing()}
            </button>
            <button
              className={`vdorder-btn-status ${
                currStatus === "ongoing" ? "active" : ""
              }`}
              disabled={updating || currStatus === "ongoing"}
              onClick={() => updateStatus("ongoing")}
            >
              {m.status_shipping()}
            </button>
            <button
              className={`vdorder-btn-status ${
                currStatus === "success" ? "active" : ""
              }`}
              disabled={updating || currStatus === "success"}
              onClick={() => updateStatus("success")}
            >
              {m.status_done()}
            </button>
          </div>
          {updating && (
            <p className="muted">
              {m.updating_status ? m.updating_status() : "กำลังอัปเดตสถานะ…"}
            </p>
          )}
        </div>

        <div className="v-card summary">
          <div className="row">
            <div>
              <p className="label">{m.order_id()}</p>
              <p>{data.orderId || data.id}</p>
            </div>
            <div>
              <p className="label">
                {m.customer ? m.customer() : m.costumer()}
              </p>
              <p>
                {data.customerName ||
                  (m.unknown_value ? m.unknown_value() : "ไม่ระบุ")}
                {data.customerPhone ? ` (${data.customerPhone})` : ""}
              </p>
            </div>
            <div>
              <p className="label">{m.date_label()}</p>
              <p>{formatThaiBuddhist(data.createdAt)}</p>
            </div>
            <div>
              <p className="label">{m.status()}</p>
              <p>{steps[currentStep]}</p>
            </div>
          </div>
        </div>

        <div className="v-card items">
          <h3>{m.food_items()}</h3>
          <div className="table">
            <div className="thead">
              <div>{m.menu_name()}</div>
              <div>{m.quantity()}</div>
              <div>{m.price()}</div>
              <div>{m.total()}</div>
            </div>
            <div className="tbody">
              {items.map((it, idx) => (
                <div className="tr" key={idx}>
                  <div>{it.name || `${m.menu()} ${idx + 1}`}</div>
                  <div>{it.qty}</div>
                  <div>{currency(it.price)}</div>
                  <div>
                    {currency((Number(it.qty) || 0) * (Number(it.price) || 0))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="total">
            <span>{m.total_all()}</span>
            <strong>{currency(total)}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
