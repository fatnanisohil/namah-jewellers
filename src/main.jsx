import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { Auth0Provider } from '@auth0/auth0-react'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Auth0Provider
      domain="dev-4u1smnpgfub0jr5c.us.auth0.com"
      clientId="K8um4J7BTxlh9z6fF5ThoKU8vNRXvSwg"
      authorizationParams={{
        redirect_uri: window.location.origin + window.location.pathname
      }}
    >
      <App />
    </Auth0Provider>
  </StrictMode>,
)