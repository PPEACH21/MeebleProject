import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MapTest from './component/MapTest.jsx'
import MapPickerButton from './component/MapPickerButton.jsx'
import MenuStore from './page/MenuStore.jsx'
import AddMenu from './component/AddMenu.jsx'
import ShowMenu from './component/showMenu.jsx'
import ShowImageExample from './component/ShowImageExample.jsx'
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AddMenu />
  </StrictMode>
)
