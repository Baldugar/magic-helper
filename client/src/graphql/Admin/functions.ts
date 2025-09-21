import { fetchData } from '../../utils/functions/fetchData'
import {
    AdminDashboard,
    AdminImportActionInput,
    AdminImportReport,
    AdminJob,
    Mutation,
    MutationadminBackfillImportArgs,
    MutationadminRetryImportArgs,
    Query,
    QueryadminImportReportsArgs,
} from '../types'
import { ADMIN_BACKFILL_IMPORT_MUTATION } from './mutations/adminBackfillImport'
import { ADMIN_RETRY_IMPORT_MUTATION } from './mutations/adminRetryImport'
import { ADMIN_DASHBOARD_QUERY } from './queries/adminDashboard'
import { ADMIN_IMPORT_REPORTS_QUERY } from './queries/adminImportReports'
import { ADMIN_LEGALITIES_DIFF_QUERY } from './queries/adminLegalitiesDiff'

export const DEFAULT_LIMIT = 10

const getDashboard = async (): Promise<AdminDashboard | undefined> => {
    const result = await fetchData<Query>(ADMIN_DASHBOARD_QUERY)
    return result?.data.adminDashboard
}

const getImportReports = async (job: AdminJob, limit?: number): Promise<AdminImportReport[] | undefined> => {
    const variables: QueryadminImportReportsArgs = {
        job,
        limit: limit ?? DEFAULT_LIMIT,
    }
    const result = await fetchData<Query, QueryadminImportReportsArgs>(ADMIN_IMPORT_REPORTS_QUERY, variables)
    return result?.data.adminImportReports
}

const getLegalitiesDiff = async (importId: string) => {
    const result = await fetchData<Query, { importId: string }>(ADMIN_LEGALITIES_DIFF_QUERY, { importId })
    return result?.data.adminLegalitiesDiff
}

const retryImport = async (input: AdminImportActionInput) => {
    const variables: MutationadminRetryImportArgs = { input }
    const result = await fetchData<Mutation, MutationadminRetryImportArgs>(ADMIN_RETRY_IMPORT_MUTATION, variables)
    return result?.data.adminRetryImport
}

const backfillImport = async (input: AdminImportActionInput) => {
    const variables: MutationadminBackfillImportArgs = { input }
    const result = await fetchData<Mutation, MutationadminBackfillImportArgs>(ADMIN_BACKFILL_IMPORT_MUTATION, variables)
    return result?.data.adminBackfillImport
}

export const AdminFunctions = {
    queries: {
        getDashboard,
        getImportReports,
        getLegalitiesDiff,
    },
    mutations: {
        retryImport,
        backfillImport,
    },
}
