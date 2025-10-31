// src/User/component/StoreCard.jsx
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

// --- helpers ---
const toNum = (v) => (typeof v === "number" ? v : Number(v) || 0);

function formatPriceRange(min, max) {
  if (min == null || max == null) return "–";
  const fmt = (n) =>
    n.toLocaleString("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  const a = toNum(min);
  const b = toNum(max);
  return a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`;
}

// รองรับหลาย key: address.latitude/longitude, address._lat/_long, หรือ lat/lng
function extractLatLngFromShop(shop) {
  const cands = [shop?.address, shop?.location, shop?.geo, shop?.coords];
  for (const obj of cands) {
    if (!obj) continue;
    const lat = obj.latitude ?? obj.lat ?? obj._lat ?? obj.Latitude ?? obj.Lat;
    const lng =
      obj.longitude ?? obj.lng ?? obj._long ?? obj.Longitude ?? obj.Lng ?? obj.lon;
    if (
      typeof lat === "number" &&
      typeof lng === "number" &&
      !Number.isNaN(lat) &&
      !Number.isNaN(lng)
    ) {
      return { lat, lng };
    }
  }
  return null;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistanceText(km) {
  if (km == null || Number.isNaN(km)) return "–";
  if (km < 1) {
    const m = Math.round((km * 1000) / 10) * 10;
    return `${m} m`;
  }
  return `${km.toFixed(1)} km`;
}

// id helpers
const getShopId = (shop) =>
  shop?.id || shop?.ID || shop?.shop_id || shop?.shopId || "";

const StoreCard = ({ datashow }) => {
  const navigate = useNavigate();
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setUserPos(null),
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  }, []);

  const handleSelectShop = (shop) => {
    const shopId = getShopId(shop);
    if (!shopId) {
      console.warn("missing shopId on shop item:", shop);
      return;
    }
    // เก็บไว้เผื่อหน้าเมนู fallback
    if (typeof window !== "undefined") {
      localStorage.setItem("currentShopId", shopId);
    }
    // ✅ ให้ match กับ <Route path="/menu/:id" element={<MenuStore/>} />
    navigate(`/menu/${encodeURIComponent(shopId)}`, {
      state: { shop, shopId },
    });
  };

  return (
    <div className="card-grid">
      {datashow.map((item, index) => {
        // รองรับทั้ง min_price/max_price และ price_min/price_max
        const minP =
          item.min_price ?? item.price_min ?? item.Min_price ?? item.Price_min;
        const maxP =
          item.max_price ?? item.price_max ?? item.Max_price ?? item.Price_max;
        const priceText = formatPriceRange(minP, maxP);

        let distanceText = "–";
        const shopLL = extractLatLngFromShop(item);
        if (userPos && shopLL) {
          const km = haversineKm(
            userPos.lat,
            userPos.lng,
            shopLL.lat,
            shopLL.lng
          );
          distanceText = formatDistanceText(km);
        }

        const shopId = getShopId(item);

        return (
          <div
            className="card"
            key={item.id || item.ID || index}
            style={{ margin: "10px", padding: "10px" }}
          >
            <div
              className="position"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                flexWrap: "nowrap",
              }}
            >
              <img
                width="250px"
                height="200px"
                style={{
                  objectFit: "cover",
                  borderRadius: "10px",
                  flex: "0 0 250px",
                }}
                src={
                  item.image ||
                  "https://static.vecteezy.com/system/resources/previews/022/059/000/non_2x/no-image-available-icon-vector.jpg"
                }
                alt={item.shop_name || "shop"}
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
                        <p>
                          <b>Rate:</b> {item.rate}
                        </p>
                        <p>
                          <b>Price:</b>{" "}
                          <span
                            style={{
                              display: "inline-block",
                              minWidth: 90,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {priceText}
                          </span>
                        </p>
                        <p>
                          <b>Distance:</b> {distanceText}
                        </p>
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
                          <span
                            style={{
                              color: item.status ? "green" : "red",
                              fontWeight: 600,
                            }}
                          >
                            {item.status ? "Open" : "Close"}
                          </span>
                        </p>
                        <p>
                          <b>Type:</b> {item.type}
                        </p>

                        {/* ✅ แสดงรหัสร้านค้า */}
                        <p>
                          <b>Shop ID:</b>{" "}
                          <span style={{ fontFamily: "monospace" }}>
                            {shopId || "—"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "20px",
                  width: "20%",
                  flex: "0 0 180px",
                }}
              >
                <button className="btn" onClick={() => handleSelectShop(item)}>
                  reserve
                </button>
                <button className="btn" onClick={() => handleSelectShop(item)}>
                  order
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StoreCard;
