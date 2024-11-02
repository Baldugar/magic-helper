export interface EnvConfig {
    domain: string
    port: number
}

export default function getEnvConfig(): EnvConfig {
    const envConfig: EnvConfig = {
        domain: 'localhost',
        port: 8080,
    }
    return envConfig
}

export const getGraphQLServerURI = (): string => {
    const envConfig = getEnvConfig()

    return `http://${envConfig.domain}:${envConfig.port}/graphql`
    // return process.env.NODE_ENV !== 'production' ? `http://${envConfig.domain}:${envConfig.port}/graphql` : '/graphql'
}

export const getDomain = (): string => {
    const envConfig = getEnvConfig()

    return envConfig.domain
    // return process.env.NODE_ENV !== 'production' ? envConfig.domain : ''
}
