// src/User/page/VendorHistory.jsx
import { useEffect, useState, useContext } from "react";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/VendorHistory.css";

// ✅ i18n
import { m } from "@/paraglide/messages.js";

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
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

const currency = (n) =>
  (Number(n) || 0).toLocaleString("th-TH", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
  });

// 🔁 ใช้คีย์สถานะจากข้อความ ถ้าไม่มีให้ fallback เป็นไทยเดิม
const canonicalStatusTH = (s) => {
  const x = String(s || "").toLowerCase();
  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(x))
    return m.status_preparing ? m.status_preparing() : "กำลังจัดเตรียม";
  if (["ongoing", "on-going", "shipping", "กำลังจัดส่ง"].includes(x))
    return m.status_shipping ? m.status_shipping() : "กำลังจัดส่ง";
  if (["success", "completed", "done", "เสร็จสิ้น", "สำเร็จ"].includes(x))
    return m.status_done ? m.status_done() : "สำเร็จ";
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
const shortId = (id = "") => (id.length > 8 ? id.slice(0, 6) + "…" : id);

/* ---------- component ---------- */
export default function VendorHistory() {
  const { auth } = useContext(AuthContext);
  const [shopId, setShopId] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [selected, setSelected] = useState(null);
  const [loadingOne, setLoadingOne] = useState(false);

  const userId = auth?.user_id || localStorage.getItem("meeble_userId");

  // เลือกชื่อจากโพรไฟล์ผู้ใช้
  const pickUserName = (u = {}) =>
    u.username || u.name || u.fullname || u.displayName || u.email || (m.customer ? m.customer() : "ลูกค้า");

  // เติม customerName ให้ลิสต์จาก userId/customerId
  const enrichCustomerNames = async (list) => {
    const ids = Array.from(
      new Set(
        list
          .map((r) => r.userId || r.customerId || r.customerID || r.customer_id)
          .filter(Boolean)
      )
    );
    if (ids.length === 0) return list;

    const nameMap = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await axios.get(`/user/${encodeURIComponent(id)}`, {
            withCredentials: true,
          });
          nameMap[id] = pickUserName(res.data || {});
        } catch (e) {
          nameMap[id] = undefined;
        }
      })
    );

    return list.map((r) => {
      if (r.customerName) return r;
      const uid = r.userId || r.customerId || r.customerID || r.customer_id;
      const nm = uid ? nameMap[uid] : undefined;
      return nm ? { ...r, customerName: nm } : r;
    });
  };

  // ดึง shopId จาก user_id เหมือน VendorOrders
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const local = localStorage.getItem("currentShopId");
        if (local) {
          setShopId(local);
          return;
        }

        if (!userId) {
          setErr(m.missing_credential ? m.missing_credential() : "ยังไม่พบข้อมูลผู้ใช้");
          return;
        }

        const res = await axios.get(`/shops/by-vendor/${userId}`, {
          withCredentials: true,
        });

        let resolvedShop = null;
        if (res.data?.hasShop && res.data.shop) {
          resolvedShop = res.data.shop;
        } else if (Array.isArray(res.data?.shops) && res.data.shops.length > 0) {
          resolvedShop = res.data.shops[0];
        }

        const id =
          resolvedShop?.id || resolvedShop?.ID || resolvedShop?.Id || "";
        if (!id) {
          setErr(m.shop_not_found ? m.shop_not_found() : "ไม่พบร้านของคุณ");
          return;
        }

        localStorage.setItem("currentShopId", id);
        setShopId(id);
      } catch (e) {
        setErr(e?.response?.data?.error || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // โหลดประวัติร้าน + เติมชื่อผู้ใช้
  const loadList = async () => {
    if (!shopId) return;
    setLoading(true);
    try {
      const url = `/api/shops/${shopId}/history`;
      const res = await axios.get(url, { withCredentials: true });

      let list = Array.isArray(res.data) ? res.data : [];

      // เรียงเวลา
      list = list.sort((a, b) => {
        const ta =
          toDate(a.finishedAt) ||
          toDate(a.movedToHistoryAt) ||
          toDate(a.updatedAt) ||
          toDate(a.createdAt) ||
          new Date(0);
        const tb =
          toDate(b.finishedAt) ||
          toDate(b.movedToHistoryAt) ||
          toDate(b.updatedAt) ||
          toDate(b.createdAt) ||
          new Date(0);
        return tb - ta;
      });

      const enriched = await enrichCustomerNames(list);
      setRows(enriched);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || (m.error_occurred ? m.error_occurred() : "เกิดข้อผิดพลาด"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  // เปิด popup แสดงรายละเอียด
  const openDetail = async (row) => {
    setLoadingOne(true);
    try {
      const url = `/api/shops/${shopId}/history/${row.id}`;
      const res = await axios.get(url, { withCredentials: true });

      let doc = res.data || row;
      if (!doc.customerName) {
        const uid = doc.userId || doc.customerId || doc.customerID || doc.customer_id;
        if (uid) {
          try {
            const prof = await axios.get(`/user/${encodeURIComponent(uid)}`, {
              withCredentials: true,
            });
            const nm = pickUserName(prof.data || {});
            if (nm) doc = { ...doc, customerName: nm };
          } catch {}
        }
      }

      setSelected(doc);
    } catch {
      setSelected(row);
    } finally {
      setLoadingOne(false);
    }
  };

  const empty = !loading && rows.length === 0 && !err;

  return (
    <div className="vh-wrap">
      <div className="vh-head">
        <h1>{m.history ? m.history() : "ประวัติการสั่งซื้อ"}</h1>
        {shopId && (
          <p className="vh-sub">
            {(m.orders_title_shop ? m.orders_title_shop() : "ออเดอร์ทั้งหมดของร้าน")} (
            shops/<code>{shopId}</code>/history)
          </p>
        )}
        <div style={{ marginTop: 8 }}>
          <button className=".vhis-btn" onClick={loadList} disabled={loading || !shopId}>
            {m.loading ? m.loading() : "รีเฟรช"}
          </button>
        </div>
      </div>

      {loading && <p className="vh-status">{m.loading_data ? m.loading_data() : "กำลังโหลดข้อมูล…"}</p>}
      {err && !loading && <p className="vh-error">{(m.error_occurred ? m.error_occurred() : "เกิดข้อผิดพลาด") + ": " + String(err)}</p>}
      {empty && <p className="vh-empty">{m.notHaveHistory ? m.notHaveHistory() : "ยังไม่มีรายการประวัติ"}</p>}

      {!loading && !err && rows.length > 0 && (
        <div className="vh-table">
          <div className="vh-thead">
            <div>{m.order_id ? m.order_id() : "ออเดอร์"}</div>
            <div>{m.customer ? m.customer() : "ลูกค้า"}</div>
            <div>{m.status ? m.status() : "สถานะ"}</div>
            <div>{m.total_all ? m.total_all() : "ยอดรวม"}</div>
            <div>{m.date_label ? m.date_label() : "เสร็จเมื่อ"}</div>
          </div>
          <div className="vh-tbody">
            {rows.map((r, i) => {
              const total = computeTotal(r);
              return (
                <div
                  className="vh-tr"
                  key={r.id || i}
                  onClick={() => openDetail(r)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openDetail(r)}
                  title={m.view_order_detail ? m.view_order_detail() : "ดูรายละเอียดออเดอร์"}
                >
                  <div className="mono">{shortId(r.id)}</div>
                  <div>{r.customerName || r.customer || (m.customer ? m.customer() : "ลูกค้า")}</div>
                  <div className={`badge ${String(r.status).toLowerCase()}`}>
                    {canonicalStatusTH(r.status)}
                  </div>
                  <div className="right">{currency(total)}</div>
                  <div>
                    {formatThaiBuddhist(
                      r.finishedAt || r.movedToHistoryAt || r.updatedAt || r.createdAt
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selected && (
        <div className="vh-modal-backdrop" onClick={() => setSelected(null)}>
          <div className="vh-modal" onClick={(e) => e.stopPropagation()}>
            <div className="vh-modal-header">
              <h3>
                {(m.order_detail ? m.order_detail() : "รายละเอียดการสั่งซื้อ")}{loadingOne ? " (…)" : ""}
              </h3>
              <button className="icon-vhis-btn" onClick={() => setSelected(null)} aria-label={m.cancel ? m.cancel() : "ปิด"}>
                ✕
              </button>
            </div>
            <div className="vh-modal-body">
              <div className="vh-grid">
                <div>
                  <p className="label">{m.order_id ? m.order_id() : "Order ID"}</p>
                  <p className="mono">{selected.id}</p>
                </div>
                <div>
                  <p className="label">{m.customer ? m.customer() : "ลูกค้า"}</p>
                  <p>{selected.customerName || selected.customer || (m.customer ? m.customer() : "ลูกค้า")}</p>
                </div>
                <div>
                  <p className="label">{m.status ? m.status() : "สถานะ"}</p>
                  <p>{canonicalStatusTH(selected.status)}</p>
                </div>
                <div>
                  <p className="label">{m.date_label ? m.date_label() : "เสร็จเมื่อ"}</p>
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
                  <p className="label">{m.total_all ? m.total_all() : "รวมทั้งสิ้น"}</p>
                  <p>
                    <strong>{currency(computeTotal(selected))}</strong>
                  </p>
                </div>
              </div>

              <h4 style={{ marginTop: 16 }}>{m.food_items ? m.food_items() : "รายการอาหาร"}</h4>
              <div className="vh-items">
                <div className="vh-items-head">
                  <div>{m.menu_name ? m.menu_name() : "เมนู"}</div>
                  <div>{m.quantity ? m.quantity() : "จำนวน"}</div>
                  <div>{m.price ? m.price() : "ราคา"}</div>
                  <div>{m.total ? m.total() : "รวม"}</div>
                </div>
                <div className="vh-items-body">
                  {(Array.isArray(selected.items) ? selected.items : []).map((it, idx) => (
                    <div className="vh-item-row" key={idx}>
                      <div>{it?.name || `${(m.menu_name ? m.menu_name() : "เมนู")} ${idx + 1}`}</div>
                      <div>{Number(it?.qty) || 0}</div>
                      <div>{currency(it?.price)}</div>
                      <div>{currency((Number(it?.qty) || 0) * (Number(it?.price) || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="vh-modal-footer">
              <button className="vhis-btn" onClick={() => setSelected(null)}>
                {m.cancel ? m.cancel() : "ปิด"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
