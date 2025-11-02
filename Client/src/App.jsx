import MenuStore from "./User/page/MenuStore";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./User/page/Login";
import HomePage from "./User/page/Home";
import { NavLayout } from "./User/component/Nav";
import { ProtectedLayout } from "./context/ProtectRoute";
import Register from "./User/page/Register";
import VerifyEmail from "./User/page/VerifyEmail";
import StorePage from "./User/page/StorePage";
import Forgotpassword from "./User/page/Forgotpassword";
import VendorOrderDetail from "./Vendor/page/vendorOrderDetail";
import Cart from "./User/page/Cart";
import History from "./User/page/History";
import Profile from "./User/page/Setting/Profile";
import SettingPage from "./User/page/Setting/Setting";
import VendorHistory from "./Vendor/page/vendorHistory";
import VendorMenu from "./Vendor/page/vendorMenu";
import VHomePage from "./Vendor/page/vHome";
import VendorOrders from "./Vendor/page/vendorOrder";
import VendorSettings from "./Vendor/page/vendorSetting";
import HistoryDetail from "@/User/page/HistoryDetail.jsx";
import Language from "./User/page/Setting/Language";
import VendorLayout from "./Vendor/component/VendorLayout"
import Reserve from "./User/page/Reserve";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<HomePage />} />
        <Route path="/forgotpass" element={<Forgotpassword />} />
        <Route path="/verifyemail" element={<VerifyEmail />} />

        <Route element={<ProtectedLayout role="user" />}>
          <Route element={<NavLayout />}>
            <Route path="/home" element={<StorePage />} />
          </Route>

          <Route element={<NavLayout focus={true} />}>
            <Route path="/history" element={<History />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/settings" element={<SettingPage />} />
            <Route path="/language" element={<Language/>} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/history/:id" element={<HistoryDetail />} />
             <Route path="/reserve/:id" element={<Reserve/>} />
          </Route>

          <Route element={<NavLayout focus={true} cart={true} />}>
            <Route path="/menu/:id" element={<MenuStore />} />
          </Route>
        </Route>

        <Route element={<ProtectedLayout role="vendor" />}>
          <Route element={<NavLayout />}>
            <Route element={<VendorLayout/>}>
              <Route path="/vendor/home" element={<VHomePage />} />
              <Route path="/vendor/orders" element={<VendorOrders />} />
              <Route
                path="/vendor/orders/:id"
                element={<VendorOrderDetail />}
              />
              <Route path="/vendor/settings" element={<VendorSettings />} />
              <Route path="/vendor/history" element={<VendorHistory />} />
              <Route
                path="/vendor/shops/:shopId/menu"
                element={<VendorMenu />}
              />
            </Route>
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App;
