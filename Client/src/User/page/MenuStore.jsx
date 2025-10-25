// src/pages/MenuStore.jsx
import axios from "@/api/axios";
import { useState, useEffect, useContext } from "react";
import Navbar from "../component/Nav.jsx";
import { useParams, useLocation } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { AuthContext } from "@/context/ProtectRoute";

// --- helpers ---
const normalizeVendor = (v) =>
  (v || "").replace(/^\/?vendors\//, "").replace(/^\//, "");
const getShopId = (shop) =>
  shop?.id || shop?.ID || shop?.shop_id || shop?.shopId || "Shop01";

const MenuStore = () => {
  const { auth } = useContext(AuthContext); // ✅ ดึงข้อมูลผู้ใช้

  const { id: rawVendorId } = useParams();
  const vendorId = normalizeVendor(rawVendorId);

  const location = useLocation();
  const shopFromState = location.state?.shop || null;

  const [shop, setShop] = useState(
    shopFromState ? { ...shopFromState, id: getShopId(shopFromState) } : null
  );
  const [menus, setMenus] = useState([]);
  const [lat, setLat] = useState(13.736717);
  const [lng, setLng] = useState(100.523186);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (shopFromState?.address?.latitude && shopFromState?.address?.longitude) {
      setLat(shopFromState.address.latitude);
      setLng(shopFromState.address.longitude);
    }
  }, [shopFromState]);

  const fetchShopIfNeeded = async (vid) => {
    if (shop) return;
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find((s) => normalizeVendor(s.vendor_id) === vid);
      if (found) {
        const withId = {
          ...found,
          id: found.id || found.ID || found.shop_id || found.shopId || "Shop01",
        };
        setShop(withId);

        const gp = withId.address;
        if (
          gp &&
          typeof gp.latitude === "number" &&
          typeof gp.longitude === "number" &&
          !(gp.latitude === 0 && gp.longitude === 0)
        ) {
          setLat(gp.latitude);
          setLng(gp.longitude);
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
    fetchShopIfNeeded(vendorId);
    fetchMenus(vendorId);
  }, [vendorId]);

  useEffect(() => {
    // 🔒 ปิดการเลื่อนของทั้งหน้า เมื่อเข้า MenuStore
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    // ✅ คืนค่ากลับตอนออกจากหน้านี้
    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  const handleOrder = async (item) => {
    const { value: qty } = await Swal.fire({
      title: `ใส่จำนวน\n${item.name}`,
      input: "number",
      inputValue: 1,
      inputAttributes: { min: 1, step: 1 },
      confirmButtonText: "เพิ่มใส่ตะกร้า",
      cancelButtonText: "ยกเลิก",
      showCancelButton: true,
    });
    if (!qty) return;

    const menuId = item.id || item.ID || item.menuId || item.menu_id || "";
    if (!menuId) {
      Swal.fire("ข้อมูลไม่ครบ", "เมนูนี้ไม่มี ID (menuId)", "error");
      return;
    }

    // ✅ ใช้ username เป็น customerId
    const customerId = auth?.username || "";
    if (!customerId) {
      Swal.fire("ยังไม่ล็อกอิน", "ไม่พบ username กรุณาล็อกอินก่อน", "error");
      return;
    }

    // optional
    const shopId = getShopId(shop);

    const payload = {
      customerId, // ✅ ใช้ username เป็น customerId
      userId: auth.user_id, // ✅ ใช้ user_id จริง (document id ใน Firestore)
      qty: Number(qty),
      item: {
        menuId,
        name: item.name,
        price: Number(item.price),
        image: item.image || "",
        description: item.description || "",
      },
      vendorId,
      shopId,
    };

    try {
      await axios.post("/api/cart/add", payload, { withCredentials: true });
      Swal.fire("สำเร็จ", "เพิ่มลงตะกร้าแล้ว", "success");
    } catch (e) {
      console.error("add to cart error:", e?.response?.data || e);
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.msg ||
        e?.message ||
        "เพิ่มลงตะกร้าไม่สำเร็จ";
      Swal.fire("ผิดพลาด", String(msg), "error");
    }
  };

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
            <button
              className="openMapBtn"
              onClick={() =>
                window.open(
                  `https://www.google.com/maps?q=${lat},${lng}`,
                  "_blank"
                )
              }
              style={btnPrimary}
            >
              Open in Map
            </button>
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
                    key={item.id || index}
                    className="menuBox"
                    style={{ margin: "10px", padding: "10px" }}
                  >
                    <button
                      onClick={() => handleOrder(item)}
                      style={{ ...cardButton, textAlign: "left" }}
                    >
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
                      <p>
                        <b>Id:</b> {item.id || item.ID || index}
                      </p>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ———— inline styles ————
const cardButton = {
  width: "100%",
  background: "white",
  border: "1px solid #eee",
  borderRadius: 10,
  padding: 10,
  cursor: "pointer",
  boxShadow: "rgba(0,0,0,0.04) 0 2px 8px",
};

const btnPrimary = {
  background: "#ffa360",
  color: "#fff",
  border: "none",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
};

export default MenuStore;
