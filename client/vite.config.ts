import { defineConfig } from 'vite'

export default defineConfig({
    server: {
        proxy: {
            '/graphql': {
                target: 'http://localhost:8080',
                changeOrigin: true,
                secure: false,
            },
        },
    },
})
