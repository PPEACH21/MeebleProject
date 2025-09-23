import 'bootstrap/dist/css/bootstrap.min.css';
import MenuStore from './page/MenuStore';
import { BrowserRouter,Routes,Route } from 'react-router-dom';
import LoginPage from './page/Login';
import HomePage from './page/Home';

import { AuthContext, ProtectedLayout  } from './context/ProtectRoute';
import { useState } from 'react';
import MapPickerButton from './component/MapPickerButton';
import Register from './page/Register';

function App() {
  const [auth,setAuth]= useState({});
  
  return(
      <BrowserRouter>
        <AuthContext .Provider value={{auth,setAuth}}>
          <Routes>
              <Route path='/register' element={<Register/>}/>
              <Route path='/login' element={<LoginPage/>}/>
              <Route path='/' element={<HomePage/>}/>

              <Route element={<ProtectedLayout />}>
                <Route path="/*"element={<LoginPage/>}/>
                <Route path="/home" element={<MenuStore />}/>
                <Route path="/mappick"element={<MapPickerButton/>}/>
              </Route>
          </Routes>
        </AuthContext.Provider>
      </BrowserRouter>
  )
}

export default App
