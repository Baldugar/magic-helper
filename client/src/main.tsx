/**
 * Application entry point.
 *
 * Sets up global providers (user, MUI theme) and mounts the React tree.
 */
import { CssBaseline, ThemeProvider } from '@mui/material'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import theme from './theme.ts'

// Bootstrap the root and render the application
ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    </StrictMode>,
)
