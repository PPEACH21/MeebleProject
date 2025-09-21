import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import MapTest from './component/MapTest.jsx'
import MapPickerButton from './component/MapPickerButton.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
      <App />
       <MapPickerButton />
  </StrictMode>
)
