// src/User/component/StoreCard.jsx
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { m } from "@/paraglide/messages";

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

// id helpers
const getShopId = (shop) =>
  shop?.id || shop?.ID || shop?.shop_id || shop?.shopId || "";

const StoreCard = ({ datashow }) => {
  const navigate = useNavigate();

  const goReserve = (shop) => {
    const shopId = getShopId(shop);
    if (!shopId) return;
    if (!shop.status) {
      Swal.fire({
        icon: "info",
        title: m.CannotReserve(),
        text: m.StoreClosed(),
        confirmButtonText: m.Agree(),
      });
      return;
    }
    if (typeof window !== "undefined") {
      localStorage.setItem("currentShopId", shopId);
    }
    navigate(`/reserve/${encodeURIComponent(shopId)}`, {
      state: { shop, shopId },
    });
  };
  return (
    <div className="card-grid">
      {datashow.map((item, index) => {
        const minP =
          item.min_price ?? item.price_min ?? item.Min_price ?? item.Price_min;
        const maxP =
          item.max_price ?? item.price_max ?? item.Max_price ?? item.Price_max;
        const priceText = formatPriceRange(minP, maxP);
        const goOrder = (shop) => {
          const shopId = getShopId(shop);
          if (!shopId) {
            console.warn("missing shopId on shop item:", shop);
            return;
          }
          if (!shop.status) {
            Swal.fire({
              icon: "info",
              title: m.cannotOrder(),
              text: m.close(),
              confirmButtonText: m.Agree(),
            });
            return;
          }
          if (typeof window !== "undefined") {
            localStorage.setItem("currentShopId", shopId);
          }
          navigate(`/menu/${encodeURIComponent(shopId)}`, {
            state: { shop, shopId },
          });
        };

        const cardKey = item.id || item.ID || index;

        return (
          <div
            className="card fade-slideDown"
            key={cardKey}
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
                  filter: item.status ? "none" : "grayscale(0.3)",
                  opacity: item.status ? 1 : 0.85,
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
                      title={item.shop_name}
                    >
                      {item.shop_name}
                    </h2>

                    <div className="position2">
                      <div>
                        <p>
                          <b>{m.Rate()}:</b> {item.rate}
                        </p>
                        <p>
                          <b>{m.Price()}:</b>{" "}
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
                          <>
                            <b>{m.Distance()}:</b>
                            {item.distance
                              ? item.distance < 1
                                ? ` ${Math.round(item.distance * 1000)}m`
                                : `${item.distance.toFixed(1)} km`
                              : "–"}
                          </>
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
                          <b>{m.description()}:</b> {item.description}
                        </p>
                        <p>
                          <b>{m.status()} : </b>
                          <span
                            style={{
                              color: item.status ? "green" : "red",
                              fontWeight: 600,
                            }}
                          >
                            {item.status ? m.open() : m.close()}
                          </span>
                        </p>
                        <p>
                          <b>{m.type()}:</b> {m[item.type]()}
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
                }}
              >
                <button
                  className="SP_btn"
                  onClick={() => goOrder(item)}
                  title={item.status ? "สั่งอาหาร" : "ร้านปิดอยู่"}
                  style={{
                    backgroundColor: item.status ? "#ffa360" : "#bbb",
                    opacity: item.status ? 1 : 0.9,
                  }}
                >
                  {m.order()}
                </button>

                <button
                  className="SP_btn"
                  onClick={() => goReserve(item)}
                  title={item.status ? "จองวันที่รับออเดอร์" : "ร้านปิดอยู่"}
                  style={{
                    backgroundColor: item.status ? "#322a04ff" : "#bbb",
                    opacity: item.status ? 1 : 0.9,
                  }}
                >
                  {m.reserve()}
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
