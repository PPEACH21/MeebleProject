import { useState, useEffect } from "react";
import axios from "@/api/axios";
import SidebarType from "../component/SidebarType.jsx";
import { m } from "@/paraglide/messages.js";
import StoreCard from "../component/StoreCard.jsx";
import { FaSearch } from "react-icons/fa";
import "@css/pages/StorePage.css";
import { IoRestaurantOutline } from "react-icons/io5";
import { IoFastFoodOutline } from "react-icons/io5";
import { RiDrinksLine, RiCake3Fill } from "react-icons/ri";
import { MdOutlineCookie } from "react-icons/md";
import LoadingPage from "../component/LoadingPage.jsx";

const getShopId = (shop) =>
  shop?.id || shop?.ID || shop?.shop_id || shop?.shopId || "";

const normalizeVendorId = (v) =>
  typeof v === "string"
    ? v.replace(/^\/?vendors\//, "").replace(/^\//, "")
    : v?.id || v?.ID || "";

const fmtTHB = (n) =>
  typeof n === "number"
    ? n.toLocaleString("th-TH", {
        style: "currency",
        currency: "THB",
        minimumFractionDigits: 0,
      })
    : "–";

export default function StorePage() {
  const [data, setData] = useState([]);
  const [datashow, setDataShow] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [type, setType] = useState([
    { name: "Maincourse", active: false, icon: <IoRestaurantOutline /> },
    { name: "FastFoods", active: false, icon: <IoFastFoodOutline /> },
    { name: "Appetizer", active: false, icon: <RiCake3Fill /> },
    { name: "Dessert", active: false, icon: <MdOutlineCookie /> },
    { name: "Beverage", active: false, icon: <RiDrinksLine /> },
  ]);

  const [sortactive, setSortActive] = useState("");
  const [userPos, setUserPos] = useState(null);

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

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Browser not supported geolocation");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Unable to retrieve user location :", err.message);
        setUserPos(null);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (userPos) {
      getshop();
    }
  }, [userPos]);

  const getshop = async () => {
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];

      const normalized = list.map((s) => {
        const shopId = getShopId(s);
        const vendorId = normalizeVendorId(s?.vendor_id);
        return {
          ...s,
          shopId,
          vendor_id: vendorId || s?.vendor_id,
        };
      });

      if (userPos) {
        normalized.forEach((shop) => {
          const lat = shop.address?.latitude ?? shop.lat ?? shop._lat;
          const lng = shop.address?.longitude ?? shop.lng ?? shop._long;
          if (typeof lat === "number" && typeof lng === "number") {
            shop.distance = haversineKm(userPos.lat, userPos.lng, lat, lng);
          } else {
            shop.distance = null;
          }
        });
      }

      console.groupCollapsed(`Shops (${normalized.length})`);

      normalized.forEach((s, i) => {
        const minp = Number(s.min_price ?? s.Min_price ?? s.minPrice ?? 0);
        const maxp = Number(s.max_price ?? s.Max_price ?? s.maxPrice ?? 0);

        console.log(`${i + 1}. ${s.shop_name || "(No Restarant)"}`, {
          shopId: s.shopId || "(missing)",
          vendorId: s.vendor_id || "(missing)",
          type: s.type || "(no type)",
          status: s.status ? "Open" : "Close",
          reserve: s.reserve_active ? "reserve_active" : "reserve_disable",
          min_price: isNaN(minp) ? "–" : `${fmtTHB(minp)} (${minp})`,
          max_price: isNaN(maxp) ? "–" : `${fmtTHB(maxp)} (${maxp})`,
          Shopdidstance: s.distance,
          priceRange:
            !isNaN(minp) && !isNaN(maxp)
              ? `${fmtTHB(minp)} – ${fmtTHB(maxp)}`
              : "–",
        });

        if (!s.shopId) {
          console.warn("No ShopID in data:", s);
        }
      });
      console.groupEnd();
      setData(normalized);
      setDataShow(normalized);
    } catch (err) {
      console.error("Error fetching shops:", err?.response?.data || err);
      setData([]);
      setDataShow([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;

    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
    };
  }, []);

  useEffect(() => {
    const activeType = type.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  }, [sortactive]);

  const filterData = (searchValue, selectedType) => {
    let filtered = data;

    if (selectedType) {
      filtered = filtered.filter(
        (shop) => shop.type?.toLowerCase() === selectedType.toLowerCase()
      );
    }
    if (searchValue) {
      filtered = filtered.filter((shop) =>
        (shop.shop_name || "").toLowerCase().includes(searchValue.toLowerCase())
      );
    }
    if (sortactive === "open") {
      filtered = filtered.filter((shop) => shop.status === true);
    }
    if (sortactive === "rate") {
      filtered = [...filtered].sort((a, b) => (b.rate || 0) - (a.rate || 0));
    }

    if (sortactive === "near") {
      filtered = [...filtered].sort((a, b) => {
        if (a.distance == null) return 1;
        if (b.distance == null) return -1;
        return a.distance - b.distance;
      });
    }
    setDataShow(filtered);
  };

  const handleTypeClick = (index) => {
    const newType = type.map((item, i) => ({
      ...item,
      active: i === index ? !item.active : false,
    }));
    setType(newType);

    const activeType = newType.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  };

  const SearchSubmit = () => {
    const activeType = type.find((t) => t.active)?.name || "";
    filterData(search, activeType);
  };

  if (loading) return <LoadingPage />;
  return (
    <div>
      <div className="mainLayout">
        <SidebarType type={type} TypeClick={handleTypeClick} />

        <div className="navHorizon">
          <div className="search">
            <h1>{m.choose_restaurant()}</h1>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={SearchSubmit}
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <FaSearch size={20} />
            </button>
          </div>

          <div className="setcenterNF">
            <div className="filter">
              <div
                className="rowset"
                style={{
                  display: "flex",
                  justifyContent: "space-evenly",
                  alignItems: "center",
                }}
              >
                <h3>{m.sort()}</h3>

                <button
                  className="btn1"
                  onClick={() =>
                    setSortActive(sortactive === "open" ? "" : "open")
                  }
                  style={{
                    padding: "20px 80px",
                    backgroundColor: sortactive === "open" ? "#FFA467" : "#fff",
                    color: sortactive === "open" ? "#fff" : "#FFA467",
                  }}
                >
                  {m.open()}
                </button>

                <button
                  className="btn1"
                  onClick={() =>
                    setSortActive(sortactive === "rate" ? "" : "rate")
                  }
                  style={{
                    padding: "20px 80px",
                    backgroundColor: sortactive === "rate" ? "#FFA467" : "#fff",
                    color: sortactive === "rate" ? "#fff" : "#FFA467",
                  }}
                >
                  {m.popular()}
                </button>

                <button
                  className="btn1"
                  onClick={() =>
                    setSortActive(sortactive === "near" ? "" : "near")
                  }
                  style={{
                    padding: "20px 80px",
                    backgroundColor: sortactive === "near" ? "#FFA467" : "#fff",
                    color: sortactive === "near" ? "#fff" : "#FFA467",
                  }}
                >
                  {m.near()}
                </button>
              </div>
            </div>
          </div>

          <div className="shop">
            <StoreCard datashow={datashow} />
          </div>
        </div>
      </div>
    </div>
  );
}
