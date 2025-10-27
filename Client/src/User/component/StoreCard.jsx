import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// --- helpers เดิม (ช่วงราคา) ---
const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);
const PRICE_KEYS = ["price", "Price", "menu_price", "cost"];
const MENU_LIST_KEYS = ["menus", "menu", "items", "menuItems", "products"];

function getPriceFromItem(it) {
  for (const k of PRICE_KEYS) {
    if (it && it[k] != null) {
      const n = toNum(it[k]);
      if (!Number.isNaN(n)) return { n, key: k };
    }
  }
  return { n: null, key: null };
}

function getPriceRangeFromShop(shop) {
  if (shop?.price_min != null && shop?.price_max != null) {
    return {
      min: toNum(shop.price_min),
      max: toNum(shop.price_max),
      source: "backend",
      menuKeyUsed: null,
      priceCount: null,
    };
  }
  for (const key of MENU_LIST_KEYS) {
    if (Array.isArray(shop?.[key]) && shop[key].length) {
      const prices = [];
      let usedPriceKey = null;
      for (const it of shop[key]) {
        const { n, key: pKey } = getPriceFromItem(it);
        if (typeof n === "number") {
          prices.push(n);
          if (!usedPriceKey && pKey) usedPriceKey = pKey;
        }
      }
      if (prices.length) {
        return {
          min: Math.min(...prices),
          max: Math.max(...prices),
          source: "fallback",
          menuKeyUsed: key,
          priceCount: prices.length,
          priceField: usedPriceKey || null,
        };
      }
    }
  }
  return { min: null, max: null, source: "none", menuKeyUsed: null, priceCount: 0 };
}

function formatPriceRange(min, max) {
  if (min == null || max == null) return "–";
  const fmt = (n) =>
    n.toLocaleString("th-TH", { style: "currency", currency: "THB", minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;
}

// --- helpers ตำแหน่ง/ระยะ ---
function extractLatLngFromShop(shop) {
  // รองรับหลายรูปแบบ: address.latitude/longitude (จาก backend Go), หรือ address.lat/lng, หรือ address._lat/_long, หรือ location/geo
  const cands = [
    shop?.address,
    shop?.location,
    shop?.geo,
    shop?.coords,
  ];
  for (const obj of cands) {
    if (!obj) continue;
    const lat = obj.latitude ?? obj.lat ?? obj._lat ?? obj.Latitude ?? obj.Lat;
    const lng = obj.longitude ?? obj.lng ?? obj._long ?? obj.Longitude ?? obj.Lng ?? obj.lon;
    if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // km
}

function formatDistanceText(km) {
  if (km == null || Number.isNaN(km)) return "–";
  if (km < 1) {
    const m = Math.round(km * 1000 / 10) * 10; // ปัดเป็น 10 เมตร
    return `${m} m`;
    }
  return `${km.toFixed(1)} km`;
}

const StoreCard = ({ datashow }) => {
  const navigate = useNavigate();

  // state เก็บตำแหน่งปัจจุบันเครื่องผู้ใช้
  const [userPos, setUserPos] = useState(null);

  // ขอพิกัดผู้ใช้ครั้งเดียว
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos(null), // ปฏิเสธสิทธิ์/เออเรอร์ → แสดง "–"
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  }, []);

  const handleSelectShop = (shop) => {
    navigate(`/menu/${shop.vendor_id}`, { state: { shop } });
  };

  return (
    <div className="card-grid">
      {datashow.map((item, index) => {
        const range = getPriceRangeFromShop(item);
        const priceText = formatPriceRange(range.min, range.max);

        // คำนวณระยะ (ถ้าได้ทั้งพิกัดผู้ใช้และพิกัดร้าน)
        let distanceText = "–";
        const shopLL = extractLatLngFromShop(item);
        if (userPos && shopLL) {
          const km = haversineKm(userPos.lat, userPos.lng, shopLL.lat, shopLL.lng);
          distanceText = formatDistanceText(km);
        }

        return (
          <div className="card" key={index} style={{ margin: "10px", padding: "10px" }}>
            <div
              className="position"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, flexWrap: "nowrap" }}
            >
              <img
                width="250px"
                height="200px"
                style={{ objectFit: "cover", borderRadius: "10px", flex: "0 0 250px" }}
                src="https://static.vecteezy.com/system/resources/previews/022/059/000/non_2x/no-image-available-icon-vector.jpg"
              />

              <div style={{ minWidth: 0, flex: "1 1 auto" }}>
                <div className="position">
                  <div>
                    <h2
                      style={{
                        margin: -2,
                        WebkitLineClamp: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "240px",
                      }}
                    >
                      {item.shop_name}
                    </h2>

                    <div className="position2">
                      <div>
                        <p><b>Rate:</b> {item.rate}</p>
                        <p>
                          <b>Price:</b>{" "}
                          <span style={{ display: "inline-block", minWidth: 90, whiteSpace: "nowrap" }}>
                            {priceText}
                          </span>
                        </p>
                        <p><b>Distance:</b> {distanceText}</p>
                      </div>

                      <div>
                        <p
                          style={{
                            WebkitLineClamp: 2,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "pre-wrap",
                            maxWidth: "240px",
                          }}
                        >
                          <b>Description:</b> {item.description}
                        </p>
                        <p>
                          <b>Status : </b>
                          <span style={{ color: item.status ? "green" : "red", fontWeight: 600 }}>
                            {item.status ? "Open" : "Close"}
                          </span>
                        </p>
                        <p><b>Type:</b> {item.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "20px", width: "20%", flex: "0 0 180px" }}>
                <button className="btn" onClick={() => handleSelectShop(item)}>reserve</button>
                <button className="btn">order</button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StoreCard;
