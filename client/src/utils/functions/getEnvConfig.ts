// client/src/utils/functions/getEnvConfig.ts
export interface EnvConfig {
    apiUrl: string
}

export default function getEnvConfig(): EnvConfig {
    return {
        apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8080',
    }
}

export const getGraphQLServerURI = () => '/graphql'

export const getDomain = (): string => {
    // Si lo necesitas en otro sitio, lo puedes extraer de apiUrl:
    const url = new URL(getGraphQLServerURI())
    return url.hostname
}
