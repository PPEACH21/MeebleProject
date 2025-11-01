import { NavLink, useParams, useLocation, generatePath } from "react-router-dom";
import "@css/components/vendorSideBar.css";

export default function VendorSidebar() {
  const params = useParams();
  const location = useLocation();

  // ดึง shopId จากหลายแหล่ง
  const paramShopId = params.shopId || params.id || "";
  const stateShopId = location.state?.shopId || location.state?.shop?.id || "";
  const savedShopId = typeof window !== "undefined" ? localStorage.getItem("currentShopId") || "" : "";

  
  const shopId = paramShopId || stateShopId || savedShopId;

  // ถ้าได้ shopId จริง ให้สร้างลิงก์เมนู; ถ้าไม่มีก็ fallback
  const menuLink = shopId && !shopId.startsWith(":")
    ? generatePath("/vendor/shops/:shopId/menu", { shopId })
    : "/vendor/shops"; // <-- เปลี่ยนเป็นหน้าที่มีจริง เช่น /vendor/home

  const menu = [
    { to: "/vendor/home", label: "Dashboard" },
    { to: "/vendor/orders", label: "Orders" },
    { to: "/vendor/settings", label: "Settings" },
    { to: "/vendor/history", label: "History" },
    { to: menuLink, label: "Menu" }, // ✅ ใช้ลิงก์ที่แทนค่าแล้ว
  ];

  return (
    <aside className="vendor-sidebar">
      <nav className="vendor-sidebar__nav">
        {menu.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            className={({ isActive }) =>
              "vendor-sidebar__item" + (isActive ? " is-active" : "")
            }
            onClick={(e) => {
              // กันผู้ใช้กด "Menu" ตอนยังไม่มี shopId
              if (item.label === "Menu" && (!shopId || shopId.startsWith(":"))) {
                e.preventDefault();
                alert("ยังไม่พบร้านที่เลือก โปรดเลือก/เปิดร้านก่อน");
              }
            }}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
