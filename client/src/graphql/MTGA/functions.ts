import { fetchData } from '../../utils/functions/fetchData'
import {
    AddIgnoredCardInput,
    MTG_Card,
    MTG_CreateDeckInput,
    MTG_CreateFilterPresetInput,
    MTG_Deck,
    MTG_DeckDashboard,
    MTG_DeleteFilterPresetInput,
    MTG_Filter_Search,
    MTG_FilterPreset,
    MTG_UpdateDeckInput,
    MTG_UpdateFilterPresetInput,
    Mutation,
    MutationaddIgnoredCardArgs,
    MutationcreateMTGDeckArgs,
    MutationcreateMTGFilterPresetArgs,
    MutationdeleteMTGDeckArgs,
    MutationdeleteMTGFilterPresetArgs,
    MutationremoveIgnoredCardArgs,
    MutationupdateMTGDeckArgs,
    MutationupdateMTGFilterPresetArgs,
    Query,
    QuerygetMTGCardsFilteredArgs,
    QuerygetMTGDeckArgs,
    QuerygetMTGFilterPresetsArgs,
    RemoveIgnoredCardInput,
    Response,
} from '../types'
import addIgnoredCard from './mutations/addIgnoredCard'
import createMTGDeck from './mutations/createMTGDeck'
import createMTGFilterPreset from './mutations/createMTGFilterPreset'
import deleteMTGADeck from './mutations/deleteMTGDeck'
import deleteMTGFilterPreset from './mutations/deleteMTGFilterPreset'
import removeIgnoredCard from './mutations/removeIgnoredCard'
import saveMTGDeckAsCopy from './mutations/saveMTGDeckAsCopy'
import updateMTGDeck from './mutations/updateMTGDeck'
import updateMTGFilterPreset from './mutations/updateMTGFilterPreset'
import getMTGCards from './queries/getMTGCards'
import getMTGCardsFiltered from './queries/getMTGCardsFiltered'
import getMTGDeck from './queries/getMTGDeck'
import getMTGDecks from './queries/getMTGDecks'
import getMTGFilterPresets from './queries/getMTGFilterPresets'

/**
 * MTG GraphQL API helpers
 *
 * This module exposes typed wrappers around GraphQL operations. Each function:
 * - Calls fetchData with the appropriate query/mutation and variables
 * - Resolves with typed data on success
 * - Rejects with a human-readable message on GraphQL error
 *
 * Consumers: Prefer using MTGFunctions.queries/mutations rather than importing
 * individual functions.
 */

// ----- QUERIES -----

/** Fetch all curated cards. */
const getMTGCardsQuery = async (): Promise<MTG_Card[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getMTGCards).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGCards)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Filter cards server-side given filter, pagination, and sort. */
const getMTGCardsFilteredQuery = async (filter: QuerygetMTGCardsFilteredArgs): Promise<MTG_Filter_Search> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGCardsFilteredArgs>(getMTGCardsFiltered, filter).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGCardsFiltered)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Fetch dashboard deck summaries. */
const getMTGDecksQuery = async (): Promise<MTG_DeckDashboard[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getMTGDecks).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGDecks)
            } else {
                reject('Failed to fetch MTG decks')
            }
        })
    })

/** Fetch a single deck by ID with full details. */
const getMTGDeckQuery = async (ID: string): Promise<MTG_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGDeckArgs>(getMTGDeck, { deckID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGDeck)
            } else {
                reject('Failed to fetch MTG deck')
            }
        })
    })

const getMTGFilterPresetsQuery = async (deckID: string): Promise<MTG_FilterPreset[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGFilterPresetsArgs>(getMTGFilterPresets, { deckID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGFilterPresets)
            } else {
                reject('Failed to fetch MTG filter presets')
            }
        })
    })

// ----- MUTATIONS -----

/** Create a new deck; Response.message contains new deck ID. */
const createMTGDeckMutation = async (input: MTG_CreateDeckInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGDeckArgs>(createMTGDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Delete an existing deck by ID. */
const deleteMTGDeckMutation = async (ID: string): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGDeckArgs>(deleteMTGADeck, { input: { deckID: ID } }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Replace deck fields and card edges. */
const updateMTGDeckMutation = async (input: MTG_UpdateDeckInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGDeckArgs>(updateMTGDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Create a new deck copying data from another deck. */
const saveMTGDeckAsCopyMutation = async (input: MTG_UpdateDeckInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGDeckArgs>(saveMTGDeckAsCopy, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.saveMTGDeckAsCopy)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Create a filter preset bound to a deck. */
const createMTGFilterPresetMutation = async (input: MTG_CreateFilterPresetInput): Promise<MTG_FilterPreset> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGFilterPresetArgs>(createMTGFilterPreset, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGFilterPreset)
            } else {
                reject('Failed to create MTG filter preset')
            }
        })
    })

/** Update an existing filter preset. */
const updateMTGFilterPresetMutation = async (input: MTG_UpdateFilterPresetInput): Promise<MTG_FilterPreset> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGFilterPresetArgs>(updateMTGFilterPreset, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateMTGFilterPreset)
            } else {
                reject('Failed to update MTG filter preset')
            }
        })
    })

/** Delete a filter preset by ID. */
const deleteMTGFilterPresetMutation = async (input: MTG_DeleteFilterPresetInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGFilterPresetArgs>(deleteMTGFilterPreset, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGFilterPreset)
            } else {
                reject('Failed to delete MTG filter preset')
            }
        })
    })

/** Mark a card as ignored for a deck. */
const addIgnoredCardMutation = async (input: AddIgnoredCardInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationaddIgnoredCardArgs>(addIgnoredCard, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.addIgnoredCard)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Remove an ignored mark from a deck/card pair. */
const removeIgnoredCardMutation = async (input: RemoveIgnoredCardInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationremoveIgnoredCardArgs>(removeIgnoredCard, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.removeIgnoredCard)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

export const MTGFunctions = {
    queries: {
        getMTGCardsQuery,
        getMTGCardsFilteredQuery,
        getMTGDecksQuery,
        getMTGDeckQuery,
        getMTGFilterPresetsQuery,
    },
    mutations: {
        createMTGDeckMutation,
        deleteMTGDeckMutation,
        updateMTGDeckMutation,
        saveMTGDeckAsCopyMutation,
        createMTGFilterPresetMutation,
        updateMTGFilterPresetMutation,
        deleteMTGFilterPresetMutation,
        addIgnoredCardMutation,
        removeIgnoredCardMutation,
    },
}
