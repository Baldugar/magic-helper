export interface EnvConfig {
    domain: string
    port: number
    keycloak: {
        url: string
    }
}

export default function getEnvConfig(): EnvConfig {
    // @ts-expect-error: __envConfig came from backend
    const envConfig: EnvConfig = __envConfig
    return envConfig
}

export const getGraphQLServerURI = (): string => {
    const envConfig = getEnvConfig()

    return process.env.NODE_ENV !== 'production' ? `http://${envConfig.domain}:${envConfig.port}/graphql` : '/graphql'
}

export const getDomain = (): string => {
    const envConfig = getEnvConfig()

    return process.env.NODE_ENV !== 'production' ? envConfig.domain : ''
}
