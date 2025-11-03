// src/User/page/StorePage.jsx
import { useState, useEffect } from "react";
import axios from "@/api/axios";
import SidebarType from "../component/SidebarType.jsx";
import { m } from "@/paraglide/messages.js";
import StoreCard from "../component/StoreCard.jsx";
import { FaSearch } from "react-icons/fa";
import "@css/pages/StorePage.module.css";
import { IoRestaurantOutline } from "react-icons/io5";
import { IoFastFoodOutline } from "react-icons/io5";
import { RiDrinksLine } from "react-icons/ri";
import { MdOutlineCookie } from "react-icons/md";
import { RiCake3Fill } from "react-icons/ri";
// ----- helpers -----
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

  const [type, setType] = useState([
    { name: m.Maincourse(), active: false,icon:<IoRestaurantOutline />},
    { name: m.Fastfood(), active: false ,icon: <IoFastFoodOutline />},
    { name: m.Dessert(), active: false,icon: <RiCake3Fill /> },
    { name: m.Appetizer(), active: false ,icon: <MdOutlineCookie />},
    { name: m.Beverage(), active: false ,icon: <RiDrinksLine />},
  ]);

  const [shopOpen, setshopOpen] = useState(false);
  const [rate, setRate] = useState(false);
  const [near, setNear] = useState(false);
  const [favorites, setFavorites] = useState(false);

  // โหลดร้าน + normalize + log สวย ๆ
  const getshop = async () => {
    try {
      const res = await axios.get("/Shop", { withCredentials: true });
      const list = Array.isArray(res.data) ? res.data : [];

      // ทำให้ทุกอันมี shopId ที่อ่านง่ายไว้ใช้งานหน้าถัดไป
      const normalized = list.map((s) => {
        const shopId = getShopId(s);
        const vendorId = normalizeVendorId(s?.vendor_id);
        return {
          ...s,
          shopId, // 👈 เพิ่มฟิลด์มาตรฐานให้เลย
          vendor_id: vendorId || s?.vendor_id, // เก็บทั้งแบบ normalize และค่าเดิม
        };
      });

      // ---- LOG: ร้านทั้งหมด ----
      console.groupCollapsed(
        `🏪 Shops (${normalized.length}) — normalized for UI`
      );
      normalized.forEach((s, i) => {
        const minp = Number(s.min_price ?? s.Min_price ?? s.minPrice ?? 0);
        const maxp = Number(s.max_price ?? s.Max_price ?? s.maxPrice ?? 0);

        console.log(`${i + 1}. ${s.shop_name || "(ไม่มีชื่อร้าน)"}`, {
          shopId: s.shopId || "(missing)",
          vendorId: s.vendor_id || "(missing)",
          type: s.type || "(no type)",
          status: s.status ? "🟢 เปิด" : "🔴 ปิด",
          reserve: s.reserve_active ? "จองได้" : "ปิดจอง",
          min_price: isNaN(minp) ? "–" : `${fmtTHB(minp)} (${minp})`,
          max_price: isNaN(maxp) ? "–" : `${fmtTHB(maxp)} (${maxp})`,
          priceRange:
            !isNaN(minp) && !isNaN(maxp)
              ? `${fmtTHB(minp)} – ${fmtTHB(maxp)}`
              : "–",
        });

        if (!s.shopId) {
          console.warn("⚠️ ร้านนี้ไม่มี shopId ในเอกสาร:", s);
        }
      });
      console.groupEnd();

      setData(normalized);
      setDataShow(normalized);
    } catch (err) {
      console.error("Error fetching shops:", err?.response?.data || err);
      setData([]);
      setDataShow([]);
    }
  };

  useEffect(() => {
    getshop();
  }, []);

  // ปิดการเลื่อนของทั้งหน้า (ตามพฤติกรรมเดิม)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopOpen, rate, near, favorites, type]);

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

    if (shopOpen) {
      filtered = filtered.filter((shop) => shop.status === true);
    }

    if (rate) {
      filtered = [...filtered].sort((a, b) => (b.rate || 0) - (a.rate || 0));
    }

    // (optional) near / favorites ไว้ค่อยเติมเงื่อนไขจริง
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
                <p>{m.sort()}</p>

                <button
                  className="btn1"
                  onClick={() => setshopOpen(!shopOpen)}
                  style={{
                    backgroundColor: shopOpen ? "#FFA467" : "#fff",
                    color: shopOpen ? "#fff" : "#FFA467",
                  }}
                >
                  {m.open()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setRate(!rate)}
                  style={{
                    backgroundColor: rate ? "#FFA467" : "#fff",
                    color: rate ? "#fff" : "#FFA467",
                  }}
                >
                  {m.popular()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setNear(!near)}
                  style={{
                    backgroundColor: near ? "#FFA467" : "#fff",
                    color: near ? "#fff" : "#FFA467",
                  }}
                >
                  {m.near()}
                </button>

                <button
                  className="btn1"
                  onClick={() => setFavorites(!favorites)}
                  style={{
                    backgroundColor: favorites ? "#FFA467" : "#fff",
                    color: favorites ? "#fff" : "#FFA467",
                  }}
                >
                  {m.favorites()}
                </button>

                <button className="btn1" style={{ width: "30%" }}>
                  {m.pirce()} V
                </button>
              </div>
            </div>
          </div>

          <div className="shop">
            {/* ส่ง datashow ซึ่งมี field shopId แล้ว ไปให้ StoreCard */}
            <StoreCard datashow={datashow} />
          </div>
        </div>
      </div>
    </div>
  );
}
