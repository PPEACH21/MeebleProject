// src/User/page/VendorHistory.jsx
import { useEffect, useState, useContext } from "react";
import axios from "@/api/axios";
import { AuthContext } from "@/context/ProtectRoute";
import "@css/pages/VendorHistory.css";

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

const canonicalStatusTH = (s) => {
  const x = String(s || "").toLowerCase();
  if (["prepare", "preparing", "กำลังจัดเตรียม"].includes(x)) return "กำลังจัดเตรียม";
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
    u.username || u.name || u.fullname || u.displayName || u.email || "ไม่ระบุ";

  // เติม customerName ให้ลิสต์จาก userId/customerId
  const enrichCustomerNames = async (list) => {
    // รวบรวม userId ที่ยังไม่มี customerName
    const ids = Array.from(
      new Set(
        list
          .map((r) => r.userId || r.customerId || r.customerID || r.customer_id)
          .filter(Boolean)
      )
    );

    if (ids.length === 0) return list;

    console.log("👤 กำลังดึงชื่อผู้ใช้จำนวน", ids.length, "คน");

    // ยิงแบบขนาน (มี try/catch แยกแต่ละราย)
    const nameMap = {};
    await Promise.all(
      ids.map(async (id) => {
        try {
          const res = await axios.get(`/user/${encodeURIComponent(id)}`, {
            withCredentials: true,
          });
          nameMap[id] = pickUserName(res.data || {});
        } catch (e) {
          console.warn("⚠️ ดึงชื่อผู้ใช้ไม่สำเร็จ:", id, e?.response?.data || e.message);
          nameMap[id] = undefined;
        }
      })
    );

    // ผูกชื่อกลับเข้าแถวที่ไม่มี customerName
    const next = list.map((r) => {
      if (r.customerName) return r;
      const uid = r.userId || r.customerId || r.customerID || r.customer_id;
      const nm = uid ? nameMap[uid] : undefined;
      return nm ? { ...r, customerName: nm } : r;
    });

    return next;
  };

  // ดึง shopId จาก user_id เหมือน VendorOrders
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const local = localStorage.getItem("currentShopId");
        if (local) {
          setShopId(local);
          console.log("✅ ใช้ shopId จาก localStorage:", local);
          return;
        }

        if (!userId) {
          setErr("ยังไม่พบข้อมูลผู้ใช้");
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
          setErr("ไม่พบร้านของคุณ");
          return;
        }

        localStorage.setItem("currentShopId", id);
        setShopId(id);
        console.log("🏪 ตั้งค่า shopId จาก backend:", id);
      } catch (e) {
        console.error("❌ โหลดร้านไม่สำเร็จ:", e?.response?.data || e.message);
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
      console.log("📥 โหลดประวัติร้านจาก:", url);
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

      // เติม customerName จาก userId/customerId
      const enriched = await enrichCustomerNames(list);

      setRows(enriched);
      console.log("✅ โหลดสำเร็จ:", enriched.length, "รายการ");
    } catch (e) {
      console.error("❌ โหลดประวัติร้านล้มเหลว:", e);
      setErr(e?.response?.data?.error || e.message || "load error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shopId) loadList();
  }, [shopId]);

  // เปิด popup แสดงรายละเอียด
  const openDetail = async (row) => {
    setLoadingOne(true);
    try {
      const url = `/api/shops/${shopId}/history/${row.id}`;
      console.log("🔎 โหลดรายละเอียด:", url);
      const res = await axios.get(url, { withCredentials: true });

      // ถ้าใน detail มี userId แต่ยังไม่มี customerName ก็เติมทันที (กันกรณี list enrich ไม่ทัน)
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
          } catch {[]} { /* เงียบ ๆ ไป */ }
        }
      }

      setSelected(doc);
      console.log("✅ รายละเอียด:", doc);
    } catch (e) {
      console.warn("⚠️ โหลดรายละเอียดไม่ได้ ใช้ข้อมูลเดิม:", e.message);
      setSelected(row);
    } finally {
      setLoadingOne(false);
    }
  };

  const empty = !loading && rows.length === 0 && !err;

  return (
    <div className="vh-wrap">
      <div className="vh-head">
        <h1>ประวัติออเดอร์ร้าน</h1>
        {shopId && (
          <p className="vh-sub">
            ดูออเดอร์ที่เสร็จแล้ว (shops/<code>{shopId}</code>/history)
          </p>
        )}
        <div style={{ marginTop: 8 }}>
          <button className="btn" onClick={loadList} disabled={loading || !shopId}>
            รีเฟรช
          </button>
        </div>
      </div>

      {loading && <p className="vh-status">กำลังโหลดข้อมูล…</p>}
      {err && !loading && <p className="vh-error">เกิดข้อผิดพลาด: {String(err)}</p>}
      {empty && <p className="vh-empty">ยังไม่มีรายการประวัติ</p>}

      {!loading && !err && rows.length > 0 && (
        <div className="vh-table">
          <div className="vh-thead">
            <div>ออเดอร์</div>
            <div>ลูกค้า</div>
            <div>สถานะ</div>
            <div>ยอดรวม</div>
            <div>เสร็จเมื่อ</div>
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
                >
                  <div className="mono">{shortId(r.id)}</div>
                  <div>{r.customerName || r.customer || "ไม่ระบุ"}</div>
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
              <h3>รายละเอียดออเดอร์ {loadingOne ? "(กำลังโหลด…)" : ""}</h3>
              <button className="icon-btn" onClick={() => setSelected(null)}>
                ✕
              </button>
            </div>
            <div className="vh-modal-body">
              <div className="vh-grid">
                <div>
                  <p className="label">Order ID</p>
                  <p className="mono">{selected.id}</p>
                </div>
                <div>
                  <p className="label">ลูกค้า</p>
                  <p>{selected.customerName || selected.customer || "ไม่ระบุ"}</p>
                </div>
                <div>
                  <p className="label">สถานะ</p>
                  <p>{canonicalStatusTH(selected.status)}</p>
                </div>
                <div>
                  <p className="label">เสร็จเมื่อ</p>
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
              <div className="vh-items">
                <div className="vh-items-head">
                  <div>เมนู</div>
                  <div>จำนวน</div>
                  <div>ราคา</div>
                  <div>รวม</div>
                </div>
                <div className="vh-items-body">
                  {(Array.isArray(selected.items) ? selected.items : []).map((it, idx) => (
                    <div className="vh-item-row" key={idx}>
                      <div>{it?.name || `เมนูที่ ${idx + 1}`}</div>
                      <div>{Number(it?.qty) || 0}</div>
                      <div>{currency(it?.price)}</div>
                      <div>{currency((Number(it?.qty) || 0) * (Number(it?.price) || 0))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="vh-modal-footer">
              <button className="btn" onClick={() => setSelected(null)}>ปิด</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
