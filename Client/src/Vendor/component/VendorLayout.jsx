import { Outlet } from "react-router-dom";
import VendorSidebar from "@/Vendor/component/VendorSideBar";
import "@css/components/vendorSideBar.css";
import "@css/pages/vendorHome.css";

const VendorLayout = ()=> {
  return (
    <div className="dashboard-layout">
      <VendorSidebar />
      <main className="dashboard-main">
        <Outlet />
      </main>
    </div>
  );
}

export default VendorLayout