import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    const isDevelopment = mode === 'development'
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [react()],
        server: isDevelopment
            ? {
                  proxy: {
                      '/config.js': {
                          target: env.SERVER_DOMAIN,
                          changeOrigin: true,
                          rewrite: (path) => path.replace(/^\/config\.js$/, '/config.js'),
                      },
                  },
              }
            : {},
    }
})
