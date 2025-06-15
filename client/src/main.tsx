import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { UserProvider } from './context/User/UserProvider.tsx'
import './index.css'
import theme from './theme.ts'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <UserProvider>
            <ThemeProvider theme={theme}>
                <CssBaseline />
                <App />
            </ThemeProvider>
        </UserProvider>
    </StrictMode>,
)
