import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vite'

export default defineConfig({
    plugins: [react()],
    server: {
        proxy: {
            '/graphql': {
                target: 'http://localhost:8081',
                changeOrigin: true,
                secure: false,
            },
        },
        hmr: {
            overlay: true, // Shows errors as overlay
            // Optimize HMR for better performance
            protocol: 'ws',
            host: 'localhost',
        },
    },
})
