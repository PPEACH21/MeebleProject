import Button from "react-bootstrap/Button";
import axios from "../api/axios";
import { useState, useEffect } from "react";
import Navbar from "../component/Nav.jsx";
import { useParams, useLocation } from "react-router-dom";

const MenuStore = () => {
  const { id: vendorId } = useParams(); // รับจาก /menu/:id
  const location = useLocation();
  const shopFromState = location.state?.shop || null;

  // ---- state ----
  const [shop, setShop] = useState(shopFromState); // ข้อมูลร้าน
  const [menus, setMenus] = useState([]); // เมนู
  const [lat, setLat] = useState(13.736717); // ค่าเริ่มต้น (กทม.)
  const [lng, setLng] = useState(100.523186);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // Firestore บางร้านเก็บ vendor_id เป็น path: "/vendors/<id>"
  const normalize = (v) =>
    (v || "").replace(/^\/?vendors\//, "").replace(/^\//, "");

  // ถ้ามี shop มาจาก state → ตั้งค่า lat/lng ทันที
  useEffect(() => {
    if (shopFromState?.address?.latitude && shopFromState?.address?.longitude) {
      setLat(shopFromState.address.latitude);
      setLng(shopFromState.address.longitude);
    }
  }, [shopFromState]);

  const fetchShopIfNeeded = async (vid) => {
    if (shop) return; // มีจาก state แล้วข้าม
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find((s) => normalize(s.vendor_id) === vid);
      if (found) {
        setShop(found);
        // ดึงพิกัดถ้ามี (Firestore GeoPoint)
        const gp = found.address;
        if (
          gp &&
          typeof gp.latitude === "number" &&
          typeof gp.longitude === "number"
        ) {
          // กันกรณี 0,0 (ยังไม่ตั้งพิกัด)
          if (!(gp.latitude === 0 && gp.longitude === 0)) {
            setLat(gp.latitude);
            setLng(gp.longitude);
          }
        }
      }
    } catch (e) {
      console.error("fetch shop error:", e);
    }
  };

  const fetchMenus = async (vid) => {
    try {
      const res = await axios.get(`/vendors/${vid}/menu`, {
        withCredentials: true,
      });
      setMenus(res.data?.menus ?? []);
      setErr("");
    } catch (e) {
      console.error("fetch menus error:", e);
      setErr("ไม่สามารถดึงเมนูได้");
      setMenus([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!vendorId) {
      setErr("missing vendor_id");
      setLoading(false);
      return;
    }
    // โหลดข้อมูลร้าน (ถ้ายังไม่มี) และโหลดเมนูคู่กัน
    fetchShopIfNeeded(vendorId);
    fetchMenus(vendorId);
  }, [vendorId]);

  // helper แสดงสถานะเปิดปิด
  // const renderStatus = (s) => (s ? "Open" : "Close");

  return (
    <>
      <Navbar />
      <div className="box">
        <div className="left">
          <div className="storeBox">
            <img
              src={
                shop?.image ||
                "https://i.pinimg.com/1200x/0d/08/60/0d0860d917320784369a58a1f01187d3.jpg"
              }
              alt="shop"
            />
            <div className="storeText">
              <h2 className="storeTitle">{shop?.shop_name || "Store"}</h2>
              <h3 className="storeRate">⭐ ดาว {shop?.rate ?? "-"}/5</h3>

              <h4 className="storeSubtitle">คำอธิบายร้าน</h4>
              <p className="storeDesc">
                {shop?.description || "No description available"}
              </p>
            </div>
          </div>

          <div className="mapBox">
            <h1>Location</h1>
            <div className="miniMap">
              <iframe
                src={`https://www.google.com/maps?q=${lat},${lng}&z=17&output=embed`}
                allowFullScreen
                loading="lazy"
                title="mini-map"
              />
            </div>
            <Button
              className="openMapBtn"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps?q=${lat},${lng}`,
                  "_blank"
                )
              }
            >
              Open in Map
            </Button>
            {/* ถ้าอยากแจ้งเตือนเมื่อพิกัดยังเป็น 0,0 */}
            {lat === 0 && lng === 0 && (
              <div style={{ color: "#b45309", marginTop: 8 }}>
                พิกัดยังไม่ถูกตั้งค่า (0,0) — โปรดอัปเดตในระบบผู้ขาย
              </div>
            )}
          </div>
        </div>

        <div className="right">
          <div className="menuScroll">
            <div className="menu">
              {loading && <div style={{ padding: 12 }}>กำลังโหลดเมนู...</div>}
              {!loading && err && (
                <div style={{ color: "crimson", padding: 12 }}>{err}</div>
              )}
              {!loading && !err && menus.length === 0 && (
                <div style={{ padding: 12 }}>ยังไม่มีเมนูให้แสดง</div>
              )}

              {!loading &&
                !err &&
                menus.map((item, index) => (
                  <div
                    key={index}
                    className="menuBox"
                    style={{ margin: "10px", padding: "10px" }}
                  >
                    <Button style={{ width: "100%", textAlign: "left" }}>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name || "menu"}
                          style={{
                            width: "100%",
                            maxWidth: 360,
                            borderRadius: 8,
                            marginBottom: 8,
                          }}
                        />
                      )}
                      <p>
                        <b>Name:</b> {item.name}
                      </p>
                      <p>
                        <b>Price:</b> {item.price} ฿
                      </p>
                      <p>
                        <b>Description:</b> {item.description}
                      </p>
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MenuStore;
