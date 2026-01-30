import { fetchData } from '../../utils/functions/fetchData'
import {
    AddIgnoredCardInput,
    MTG_AssignTagToCardInput,
    MTG_AssignTagToDeckInput,
    MTG_Card,
    MTG_CreateDeckInput,
    MTG_CreateFilterPresetInput,
    MTG_CreateTagInput,
    MTG_Deck,
    MTG_DeckDashboard,
    MTG_DeleteFilterPresetInput,
    MTG_DeleteTagInput,
    MTG_Filter_Search,
    MTG_FilterPreset,
    MTG_Tag,
    MTG_UnassignTagFromCardInput,
    MTG_UnassignTagFromDeckInput,
    MTG_UpdateDeckInput,
    MTG_UpdateFilterPresetInput,
    MTG_UpdateTagInput,
    Mutation,
    MutationaddIgnoredCardArgs,
    MutationassignTagToCardArgs,
    MutationassignTagToDeckArgs,
    MutationcreateMTGDeckArgs,
    MutationcreateMTGFilterPresetArgs,
    MutationcreateMTGTagArgs,
    MutationdeleteMTGDeckArgs,
    MutationdeleteMTGFilterPresetArgs,
    MutationdeleteMTGTagArgs,
    MutationremoveIgnoredCardArgs,
    MutationunassignTagFromCardArgs,
    MutationunassignTagFromDeckArgs,
    MutationupdateMTGDeckArgs,
    MutationupdateMTGFilterPresetArgs,
    MutationupdateMTGTagArgs,
    Query,
    QuerygetMTGCardsFilteredArgs,
    QuerygetMTGDeckArgs,
    QuerygetMTGFilterPresetsArgs,
    QuerygetMTGTagArgs,
    RemoveIgnoredCardInput,
    Response,
} from '../types'
import addIgnoredCard from './mutations/addIgnoredCard'
import assignTagToCard from './mutations/assignTagToCard'
import assignTagToDeck from './mutations/assignTagToDeck'
import createMTGDeck from './mutations/createMTGDeck'
import createMTGFilterPreset from './mutations/createMTGFilterPreset'
import createMTGTag from './mutations/createMTGTag'
import deleteMTGADeck from './mutations/deleteMTGDeck'
import deleteMTGFilterPreset from './mutations/deleteMTGFilterPreset'
import deleteMTGTag from './mutations/deleteMTGTag'
import removeIgnoredCard from './mutations/removeIgnoredCard'
import saveMTGDeckAsCopy from './mutations/saveMTGDeckAsCopy'
import unassignTagFromCard from './mutations/unassignTagFromCard'
import unassignTagFromDeck from './mutations/unassignTagFromDeck'
import updateMTGDeck from './mutations/updateMTGDeck'
import updateMTGFilterPreset from './mutations/updateMTGFilterPreset'
import updateMTGTag from './mutations/updateMTGTag'
import getMTGCards from './queries/getMTGCards'
import getMTGCardsFiltered from './queries/getMTGCardsFiltered'
import getMTGDeck from './queries/getMTGDeck'
import getMTGDecks from './queries/getMTGDecks'
import getMTGFilterPresets from './queries/getMTGFilterPresets'
import getMTGTag from './queries/getMTGTag'
import getMTGTags from './queries/getMTGTags'

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

/** Fetch all tags. */
const getMTGTagsQuery = async (): Promise<MTG_Tag[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getMTGTags).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGTags)
            } else {
                reject('Failed to fetch MTG tags')
            }
        })
    })

/** Fetch a single tag by ID. */
const getMTGTagQuery = async (tagID: string): Promise<MTG_Tag | null | undefined> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGTagArgs>(getMTGTag, { tagID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGTag)
            } else {
                reject('Failed to fetch MTG tag')
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

/** Create a new tag. */
const createMTGTagMutation = async (input: MTG_CreateTagInput): Promise<MTG_Tag> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGTagArgs>(createMTGTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGTag)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to create tag')
            }
        })
    })

/** Update an existing tag. */
const updateMTGTagMutation = async (input: MTG_UpdateTagInput): Promise<MTG_Tag | null | undefined> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGTagArgs>(updateMTGTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateMTGTag)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to update tag')
            }
        })
    })

/** Delete a tag by ID. */
const deleteMTGTagMutation = async (input: MTG_DeleteTagInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGTagArgs>(deleteMTGTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGTag)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to delete tag')
            }
        })
    })

/** Assign a tag to a card. */
const assignTagToCardMutation = async (input: MTG_AssignTagToCardInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationassignTagToCardArgs>(assignTagToCard, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.assignTagToCard)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to assign tag to card')
            }
        })
    })

/** Unassign a tag from a card. */
const unassignTagFromCardMutation = async (input: MTG_UnassignTagFromCardInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationunassignTagFromCardArgs>(unassignTagFromCard, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.unassignTagFromCard)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to unassign tag from card')
            }
        })
    })

/** Assign a tag to a deck. */
const assignTagToDeckMutation = async (input: MTG_AssignTagToDeckInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationassignTagToDeckArgs>(assignTagToDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.assignTagToDeck)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to assign tag to deck')
            }
        })
    })

/** Unassign a tag from a deck. */
const unassignTagFromDeckMutation = async (input: MTG_UnassignTagFromDeckInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationunassignTagFromDeckArgs>(unassignTagFromDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.unassignTagFromDeck)
            } else {
                reject(response?.errors?.[0]?.message ?? 'Failed to unassign tag from deck')
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
        getMTGTagsQuery,
        getMTGTagQuery,
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
        createMTGTagMutation,
        updateMTGTagMutation,
        deleteMTGTagMutation,
        assignTagToCardMutation,
        unassignTagFromCardMutation,
        assignTagToDeckMutation,
        unassignTagFromDeckMutation,
    },
}
