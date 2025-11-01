// src/User/page/History.jsx
import { useContext, useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";            // ✅ เพิ่ม
import { AuthContext } from "@/context/ProtectRoute";
import axios from "@/api/axios";
import "@css/pages/History.css";

/* ---------- helpers ---------- */
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
  o.shop_name ||
  o.storeName ||
  o.shopName ||
  o.vendorName ||
  o.store?.name ||
  o.shop?.name ||
  "ร้านไม่ระบุ";

const getOrderId = (o) => o.orderId || o.order_id || o.id || "—";

const canonicalStatusTH = (s) => {
  const x = String(s || "").toLowerCase();
  if (["prepare", "preparing", "กำลังเตรียม", "กำลังจัดเตรียม"].includes(x)) return "กำลังจัดเตรียม";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(x)) return "กำลังจัดส่ง";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(x)) return "สำเร็จ";
  return s || "-";
};

const computeTotal = (raw) => {
  if (typeof raw?.total === "number") return raw.total;
  const items = Array.isArray(raw?.items) ? raw.items : [];
  return items.reduce(
    (s, it) => s + (Number(it?.qty) || 0) * (Number(it?.price) || 0),
    0
  );
};

const currency = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  });

/* ---------- main component ---------- */
export default function History() {
  const { auth } = useContext(AuthContext);
  const navigate = useNavigate();                        // ✅ เพิ่ม

  const [processOrders, setProcessOrders] = useState([]); // จาก /orders
  const [successOrders, setSuccessOrders] = useState([]); // จาก users/{userId}/history
  const [loading, setLoading] = useState(true);

  // popup state (ใช้เฉพาะ success)
  const [selected, setSelected] = useState(null);
  const [loadingOne, setLoadingOne] = useState(false);
  const [errOne, setErrOne] = useState("");

  const userId = auth?.user_id;

  // ✅ ดึง "กำลังดำเนินการ" จาก /orders?userId=
  const fetchProcess = useCallback(async () => {
    if (!userId) return [];
    const res = await axios.get(`/orders`, {
      params: { userId },
      withCredentials: true,
    });
    const arr = Array.isArray(res.data) ? res.data : [];
    arr.sort((a, b) => {
      const tb = toDate(b.createdAt) || toDate(b.updatedAt) || new Date(0);
      const ta = toDate(a.createdAt) || toDate(a.updatedAt) || new Date(0);
      return tb - ta;
    });
    // กรองเอาเฉพาะที่ยังไม่ success
    return arr.filter((o) => {
      const st = String(o.status || "").trim().toLowerCase();
      return !["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(st);
    });
  }, [userId]);

  // ✅ ดึง "สำเร็จแล้ว" จาก users/{userId}/history
  const fetchSuccess = useCallback(async () => {
    if (!userId) return [];
    const res = await axios.get(`/users/${userId}/history`, { withCredentials: true });
    const arr = Array.isArray(res.data) ? res.data : [];
    arr.sort((a, b) => {
      const tb = toDate(b.finishedAt) || toDate(b.movedToHistoryAt) || toDate(b.updatedAt) || toDate(b.createdAt) || new Date(0);
      const ta = toDate(a.finishedAt) || toDate(a.movedToHistoryAt) || toDate(a.updatedAt) || toDate(a.createdAt) || new Date(0);
      return tb - ta;
    });
    return arr;
  }, [userId]);

  // โหลดคู่กัน
  useEffect(() => {
    (async () => {
      if (!userId) {
        setProcessOrders([]); setSuccessOrders([]); setLoading(false); return;
      }
      try {
        setLoading(true);
        const [p, s] = await Promise.all([fetchProcess(), fetchSuccess()]);
        setProcessOrders(p); setSuccessOrders(s);
      } catch (e) {
        console.error("โหลดประวัติล้มเหลว:", e?.response?.data || e.message);
        setProcessOrders([]); setSuccessOrders([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId, fetchProcess, fetchSuccess]);

  // ---------- open detail ----------
  // success => popup (เดิม)
  // process (ongoing/prepare) => ไปหน้า HistoryDetail
  const openDetail = async (row, type) => {
    if (type !== "success") {
      const docId = row.id || row.orderId || row.order_id;
      if (!docId) return;
      // ⚠️ ถ้าโปรเจกต์ใช้ path อื่น ให้เปลี่ยนได้ เช่น `/orders/${docId}`
      navigate(`/history/${encodeURIComponent(docId)}`, { state: { from: "history", orderSummary: row } });
      return;
    }

    // ↓ ใช้ popup สำหรับ success เหมือนเดิม
    setErrOne("");
    setLoadingOne(true);
    try {
      const url = `/users/${encodeURIComponent(userId)}/history/${encodeURIComponent(row.id)}`;
      const res = await axios.get(url, { withCredentials: true });
      setSelected(res.data || row);
    } catch (e) {
      console.warn("⚠️ โหลดรายละเอียดไม่สำเร็จ ใช้ข้อมูลเดิม:", e?.response?.data || e.message);
      setErrOne(e?.response?.data?.error || e.message || "");
      setSelected(row);
    } finally {
      setLoadingOne(false);
    }
  };

  const closeDetail = () => { setSelected(null); setErrOne(""); };

  // ---------- Card ----------
  const OrderCard = ({ order, type }) => {
    const st = String(order.status || "").trim().toLowerCase();
    const isOngoing =
      type !== "success" &&
      ["ongoing", "on-going", "prepare", "preparing", "กำลังจัดส่ง"].includes(st);

    const chipClass =
      type === "success"
        ? "his-chip--success"
        : isOngoing
        ? "his-chip--ongoing"
        : "his-chip--process";

    const chipText =
      type === "success" ? "สำเร็จ" : isOngoing ? "กำลังจัดส่ง" : "ดำเนินการ";

    const when =
      type === "success"
        ? order.finishedAt || order.movedToHistoryAt || order.updatedAt || order.createdAt
        : order.createdAt || order.updatedAt;

    const handleClick = () => openDetail(order, type);

    return (
      <div className="his-card" role="button" onClick={handleClick} title="ดูรายละเอียดคำสั่งซื้อ">
        <div className="his-card__left">
          <div className="his-field">
            <div className="his-label">Order ID</div>
            <div className="his-value">{getOrderId(order)}</div>
          </div>
          <div className="his-field">
            <div className="his-label">Date</div>
            <div className="his-value">{formatThaiBuddhist(when)}</div>
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
                    <OrderCard key={`p-${o.id}`} order={o} type="process" />
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
                    <OrderCard key={`s-${o.id}`} order={o} type="success" />
                  ))}
                </div>
              ) : (
                <div className="his-empty">ยังไม่มีคำสั่งซื้อสำเร็จ</div>
              )}
            </section>
          </div>
        )}
      </div>

      {/* ---------- Popup Modal (เฉพาะ success) ---------- */}
      {selected && (
        <div className="his-modal-backdrop" onClick={closeDetail}>
          <div className="his-modal" onClick={(e) => e.stopPropagation()}>
            <div className="his-modal-header">
              <h3>รายละเอียดคำสั่งซื้อ {loadingOne ? "(กำลังโหลด…)" : ""}</h3>
              <button className="icon-btn" onClick={closeDetail} aria-label="close">✕</button>
            </div>

            {errOne && <div className="his-error" style={{ marginBottom: 8 }}>{String(errOne)}</div>}

            <div className="his-modal-body">
              <div className="his-grid2">
                <div>
                  <p className="label">Order ID</p>
                  <p className="mono">{getOrderId(selected)}</p>
                </div>
                <div>
                  <p className="label">ร้านค้า</p>
                  <p>{getStoreName(selected)}</p>
                </div>
                <div>
                  <p className="label">สถานะ</p>
                  <p>{canonicalStatusTH(selected.status)}</p>
                </div>
                <div>
                  <p className="label">เวลา</p>
                  <p>
                    {formatThaiBuddhist(
                      selected.finishedAt ||
                        selected.movedToHistoryAt ||
                        selected.updatedAt ||
                        selected.createdAt
                    )}
                  </p>
                </div>
                <div>
                  <p className="label">รวมทั้งสิ้น</p>
                  <p><strong>{currency(computeTotal(selected))}</strong></p>
                </div>
              </div>

              <h4 style={{ marginTop: 16 }}>รายการอาหาร</h4>
              <div className="his-items">
                <div className="his-items-head">
                  <div>เมนู</div>
                  <div>จำนวน</div>
                  <div>ราคา</div>
                  <div>รวม</div>
                </div>
                <div className="his-items-body">
                  {(Array.isArray(selected.items) ? selected.items : []).map((it, idx) => {
                    const qty = Number(it?.qty) || 0;
                    const price = Number(it?.price) || 0;
                    return (
                      <div className="his-item-row" key={idx}>
                        <div>{it?.name || `เมนูที่ ${idx + 1}`}</div>
                        <div>{qty}</div>
                        <div>{currency(price)}</div>
                        <div>{currency(qty * price)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="his-modal-footer">
              <button className="btn" onClick={closeDetail}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
