import { Outlet } from "react-router-dom";
import VendorSidebar from "@/Vendor/component/VendorSideBar";
import "@css/components/VendorSidebar.css";
import "@css/pages/vendorHome.css";

export default function VendorLayout() {
  return (
    <div className="dashboard-layout">
      <VendorSidebar />
      <main className="dashboard-main">
        <Outlet /> {/* ✅ ใช้แสดงหน้าแต่ละ route */}
      </main>
    </div>
  );
}
