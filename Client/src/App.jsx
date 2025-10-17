import 'bootstrap/dist/css/bootstrap.min.css';
import MenuStore from './page/MenuStore';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import LoginPage from './page/Login';
import HomePage from './page/Home';

import { ProtectedLayout  } from './context/ProtectRoute';
import MapPickerButton from './component/MapPickerButton';
import Register from './page/Register';
import VerifyEmail from './page/VerifyEmail';
import StorePage from './page/StorePage';

function App() {
  return(
      <BrowserRouter>
          <Routes>
              <Route path='/register' element={<Register/>}/>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/' element={<HomePage/>}/>

              <Route element={<ProtectedLayout />}>
                <Route path='/verifyemail' element={<VerifyEmail/>}/>
                <Route path="/home" element={<MenuStore />}/>
                <Route path="/mappick"element={<MapPickerButton/>}/>
                <Route path="/*"element={<LoginPage/>}/>
                <Route path="/store"element={<StorePage/>}/>
              </Route>
          </Routes>
      </BrowserRouter>
  )
}

export default App
