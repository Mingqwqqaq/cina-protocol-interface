import ReactDOM from 'react-dom/client'
import App from '@/App'
import { AppProviders } from '@/app/AppProviders'
import { useAppStore } from '@/stores/app'
import '@/style.css'

useAppStore.getState().initializeApp()

ReactDOM.createRoot(document.getElementById('app') as HTMLElement).render(
  <AppProviders>
    <App />
  </AppProviders>
)
