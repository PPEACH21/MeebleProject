import MenuStore from './User/page/MenuStore';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import LoginPage from './User/page/Login';
import HomePage from './User/page/Home';

import { ProtectedLayout  } from './context/ProtectRoute';
import MapPickerButton from './User/component/MapPickerButton';
import Register from './User/page/Register';
import VerifyEmail from './User/page/VerifyEmail';
import StorePage from './User/page/StorePage';
import Forgotpassword from './User/page/Forgotpassword';
import Cart from './User/page/Cart';
import History from './User/page/History';
import Profile from './User/page/Profile';
import SettingPage from './User/page/Setting';

import HistoryDetail from "@/User/page/HistoryDetail.jsx";

function App() {
  return(
      <BrowserRouter>
          <Routes>
              <Route path='/register' element={<Register/>}/>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/' element={<HomePage/>}/>
              <Route path='/forgotpass' element={<Forgotpassword/>}/>
              
              <Route element={<ProtectedLayout />}>
                <Route path='/verifyemail' element={<VerifyEmail/>}/>
                <Route path="/home" element={<StorePage />}/>
                <Route path="/mappick"element={<MapPickerButton/>}/>
                <Route path="/*"element={<LoginPage/>}/>
                <Route path="/menu/:id"element={<MenuStore/>}/>
                <Route path="/cart"element={<Cart/>}/>
                <Route path="/history"element={<History/>}/>
                <Route path="/settings"element={<SettingPage/>}/>
                <Route path="/profile"element={<Profile/>}/>
                <Route path="/history/:id" element={<HistoryDetail />} />
              </Route>
          </Routes>
      </BrowserRouter>
  )
}

export default App
