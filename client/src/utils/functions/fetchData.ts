import { DocumentNode } from 'graphql'
import {
    Mutation,
    MutationcreateMTGDeckArgs,
    MutationdeleteMTGDeckArgs,
    MutationsaveMTGDeckAsCopyArgs,
    MutationupdateMTGDeckArgs,
    Query,
    QuerygetMTGCardPackagesArgs,
    QuerygetMTGCardsFilteredArgs,
    QuerygetMTGDeckArgs,
    QuerytagArgs,
} from '../../graphql/types'
import { getGraphQLServerURI } from './getEnvConfig'

export interface FetchResult<Result = Query | Mutation> {
    errors: FetchError[]
    data: Result
}

export interface FetchError {
    message: string
    path: string[]
}
type VariablesFor<Result> = Result extends { __typename?: 'Query' }
    ? QuerygetMTGCardPackagesArgs | QuerygetMTGCardsFilteredArgs | QuerygetMTGDeckArgs | QuerytagArgs | undefined
    : Result extends { __typename?: 'Mutation' }
    ?
          | MutationcreateMTGDeckArgs
          | MutationdeleteMTGDeckArgs
          | MutationupdateMTGDeckArgs
          | MutationsaveMTGDeckAsCopyArgs
          | undefined
    : never

export const fetchData = async <Result = Query | Mutation, Variables = VariablesFor<Result> | undefined>(
    query: DocumentNode,
    variables?: Variables,
): Promise<FetchResult<Result> | undefined> => {
    if (!query.loc) return

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }

    try {
        const response = await fetch(getGraphQLServerURI(), {
            method: 'POST',
            headers: headers,
            credentials: 'omit',
            body: JSON.stringify({
                query: query.loc.source.body,
                variables: variables,
            }),
        })

        if (response?.status === 401) {
            //NOTE: will be handled by oidc package
            return undefined
        }
        if (!response) return undefined
        const data = await response.json()
        if (data.errors) {
            const msgs = data.errors.map((e: { message: string }) => e.message)
            console.error('GraphQL errors:', msgs)
            return undefined
        }
        return data as FetchResult<Result>
    } catch (e) {
        console.error(e)
        throw e
    }
}

export const fetchDataRaw = async <Variables = unknown>(
    query: DocumentNode,
    variables?: Variables,
): Promise<Response | undefined> => {
    if (!query.loc) return

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Accept: 'application/json',
    }

    try {
        const response = await fetch(getGraphQLServerURI(), {
            method: 'POST',
            headers: headers,
            credentials: 'omit',
            body: JSON.stringify({
                query: query.loc.source.body,
                variables: variables,
            }),
        })
        if (!response) return undefined
        return response
    } catch (e) {
        console.error(e)
        throw e
    }
}
