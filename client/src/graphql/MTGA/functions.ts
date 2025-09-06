import { fetchData } from '../../utils/functions/fetchData'
import {
    AddIgnoredCardInput,
    AssignTagInput,
    CreateTagInput,
    MTG_AddCardToCardPackageInput,
    MTG_Card,
    MTG_CardPackage,
    MTG_CreateCardPackageInput,
    MTG_CreateDeckInput,
    MTG_Deck,
    MTG_DeckDashboard,
    MTG_EditCardPackageNameInput,
    MTG_Filter_Search,
    MTG_RemoveCardFromCardPackageInput,
    MTG_UpdateDeckInput,
    Mutation,
    MutationaddIgnoredCardArgs,
    MutationaddMTGCardToCardPackageArgs,
    MutationassignTagArgs,
    MutationcreateMTGCardPackageArgs,
    MutationcreateMTGDeckArgs,
    MutationcreateTagArgs,
    MutationdeleteMTGCardPackageArgs,
    MutationdeleteMTGDeckArgs,
    MutationdeleteTagArgs,
    MutationeditMTGCardPackageNameArgs,
    MutationrateArgs,
    MutationremoveIgnoredCardArgs,
    MutationremoveMTGCardFromCardPackageArgs,
    MutationunassignTagArgs,
    MutationupdateMTGDeckArgs,
    MutationupdateTagArgs,
    Query,
    QuerygetMTGCardPackagesArgs,
    QuerygetMTGCardsFilteredArgs,
    QuerygetMTGDeckArgs,
    RateInput,
    RemoveIgnoredCardInput,
    Response,
    Tag,
    UnassignTagInput,
    UpdateTagInput,
} from '../types'
import addIgnoredCard from './mutations/addIgnoredCard'
import addMTGCardToCardPackage from './mutations/addMTGCardToCardPackage'
import { assignTag } from './mutations/assignTag'
import createMTGCardPackage from './mutations/createMTGCardPackage'
import createMTGDeck from './mutations/createMTGDeck'
import { createTag } from './mutations/createTag'
import deleteMTGCardPackage from './mutations/deleteMTGCardPackage'
import deleteMTGADeck from './mutations/deleteMTGDeck'
import { deleteTag } from './mutations/deleteTag'
import editMTGCardPackageName from './mutations/editMTGCardPackageName'
import { rate } from './mutations/rate'
import removeIgnoredCard from './mutations/removeIgnoredCard'
import removeMTGCardFromCardPackage from './mutations/removeMTGCardFromCardPackage'
import saveMTGDeckAsCopy from './mutations/saveMTGDeckAsCopy'
import { unassignTag } from './mutations/unassignTag'
import updateMTGDeck from './mutations/updateMTGDeck'
import { updateTag } from './mutations/updateTag'
import getMTGCardPackages from './queries/getMTGCardPackages'
import getMTGCards from './queries/getMTGCards'
import getMTGCardsFiltered from './queries/getMTGCardsFiltered'
import getMTGDeck from './queries/getMTGDeck'
import getMTGDecks from './queries/getMTGDecks'
import { getTagsQuery } from './queries/getTags'

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

/** Fetch all card packages or one by ID. */
const getMTGCardPackagesQuery = async (ID?: string): Promise<MTG_CardPackage[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGCardPackagesArgs>(getMTGCardPackages, { cardPackageID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGCardPackages)
            } else {
                reject('Failed to fetch MTG card packages')
            }
        })
    })

/** Fetch all tags (card and deck). */
const getMTGTagsQuery = async (): Promise<Tag[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getTagsQuery).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.tags)
            } else {
                reject('Failed to fetch MTG tags')
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

/** Create a new card package container. */
const createMTGCardPackageMutation = async (input: MTG_CreateCardPackageInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGCardPackageArgs>(createMTGCardPackage, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGCardPackage)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Delete a card package by ID. */
const deleteMTGCardPackageMutation = async (ID: string): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGCardPackageArgs>(deleteMTGCardPackage, {
            input: { cardPackageID: ID },
        }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGCardPackage)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Rename a card package. */
const editMTGCardPackageNameMutation = async (input: MTG_EditCardPackageNameInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationeditMTGCardPackageNameArgs>(editMTGCardPackageName, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.editMTGCardPackageName)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Add a card entry to a package. */
const addMTGCardToCardPackageMutation = async (input: MTG_AddCardToCardPackageInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationaddMTGCardToCardPackageArgs>(addMTGCardToCardPackage, { input }).then(
            (response) => {
                if (response && response.data && !response.errors) {
                    resolve(response.data.addMTGCardToCardPackage)
                } else {
                    reject('Failed to fetch MTG cards')
                }
            },
        )
    })

/** Remove a card entry from a package. */
const removeMTGCardFromCardPackageMutation = async (input: MTG_RemoveCardFromCardPackageInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationremoveMTGCardFromCardPackageArgs>(removeMTGCardFromCardPackage, { input }).then(
            (response) => {
                if (response && response.data && !response.errors) {
                    resolve(response.data.removeMTGCardFromCardPackage)
                } else {
                    reject('Failed to fetch MTG cards')
                }
            },
        )
    })

/** Create a tag; optionally links to a card. */
const createTagMutation = async (input: CreateTagInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateTagArgs>(createTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Update tag name/description/colors. */
const updateTagMutation = async (input: UpdateTagInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateTagArgs>(updateTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Delete a tag by ID. */
const deleteTagMutation = async (ID: string): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteTagArgs>(deleteTag, { tagID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Assign a tag to a card. */
const assignTagMutation = async (input: AssignTagInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationassignTagArgs>(assignTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.assignTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Unassign a tag from a card. */
const unassignTagMutation = async (input: UnassignTagInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationunassignTagArgs>(unassignTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.unassignTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

/** Rate a card or tag. */
const rateMutation = async (input: RateInput): Promise<Response> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationrateArgs>(rate, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.rate)
            } else {
                reject('Failed to fetch MTG cards')
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
        getMTGCardPackagesQuery,
        getMTGTagsQuery,
    },
    mutations: {
        createMTGDeckMutation,
        deleteMTGDeckMutation,
        updateMTGDeckMutation,
        saveMTGDeckAsCopyMutation,
        createMTGCardPackageMutation,
        deleteMTGCardPackageMutation,
        editMTGCardPackageNameMutation,
        addMTGCardToCardPackageMutation,
        removeMTGCardFromCardPackageMutation,
        createTagMutation,
        updateTagMutation,
        deleteTagMutation,
        assignTagMutation,
        unassignTagMutation,
        rateMutation,
        addIgnoredCardMutation,
        removeIgnoredCardMutation,
    },
}
