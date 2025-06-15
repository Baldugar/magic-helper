import { fetchData } from '../../utils/functions/fetchData'
import {
    AssignTagInput,
    CreateTagInput,
    MTG_AddCardToCardPackageInput,
    MTG_Card,
    MTG_CardPackage,
    MTG_CreateCardPackageInput,
    MTG_CreateDeckInput,
    MTG_Deck,
    MTG_RemoveCardFromCardPackageInput,
    MTG_UpdateDeckInput,
    Mutation,
    MutationaddMTGCardToCardPackageArgs,
    MutationassignTagArgs,
    MutationcreateMTGCardPackageArgs,
    MutationcreateMTGDeckArgs,
    MutationcreateTagArgs,
    MutationdeleteMTGCardPackageArgs,
    MutationdeleteMTGDeckArgs,
    MutationdeleteTagArgs,
    MutationrateArgs,
    MutationremoveMTGCardFromCardPackageArgs,
    MutationunassignTagArgs,
    MutationupdateMTGDeckArgs,
    MutationupdateTagArgs,
    Query,
    QuerygetMTGCardPackagesArgs,
    QuerygetMTGDecksArgs,
    RateInput,
    Tag,
    UnassignTagInput,
    UpdateTagInput,
} from '../types'
import addMTGCardToCardPackage from './mutations/addMTGCardToCardPackage'
import { assignTag } from './mutations/assignTag'
import createMTGCardPackage from './mutations/createMTGCardPackage'
import createMTGDeck from './mutations/createMTGDeck'
import { createTag } from './mutations/createTag'
import deleteMTGCardPackage from './mutations/deleteMTGCardPackage'
import deleteMTGADeck from './mutations/deleteMTGDeck'
import { deleteTag } from './mutations/deleteTag'
import { rate } from './mutations/rate'
import removeMTGCardFromCardPackage from './mutations/removeMTGCardFromCardPackage'
import saveMTGDeckAsCopy from './mutations/saveMTGDeckAsCopy'
import { unassignTag } from './mutations/unassignTag'
import updateMTGDeck from './mutations/updateMTGDeck'
import { updateTag } from './mutations/updateTag'
import getMTGCardPackages from './queries/getMTGCardPackages'
import getMTGCards from './queries/getMTGCards'
import getMTGDecks from './queries/getMTGDecks'
import { getTagsQuery } from './queries/getTags'

// ----- QUERIES -----

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

const getMTGDecksQuery = async (ID?: string): Promise<MTG_Deck[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGDecksArgs>(getMTGDecks, { deckID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGDecks)
            } else {
                reject('Failed to fetch MTG decks')
            }
        })
    })

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

const createMTGDeckMutation = async (input: MTG_CreateDeckInput): Promise<MTG_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGDeckArgs>(createMTGDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const deleteMTGDeckMutation = async (ID: string): Promise<boolean> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGDeckArgs>(deleteMTGADeck, { input: { deckID: ID } }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const updateMTGDeckMutation = async (input: MTG_UpdateDeckInput): Promise<MTG_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGDeckArgs>(updateMTGDeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateMTGDeck)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const saveMTGDeckAsCopyMutation = async (input: MTG_UpdateDeckInput): Promise<MTG_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGDeckArgs>(saveMTGDeckAsCopy, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.saveMTGDeckAsCopy)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const createMTGCardPackageMutation = async (input: MTG_CreateCardPackageInput): Promise<MTG_CardPackage> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGCardPackageArgs>(createMTGCardPackage, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGCardPackage)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const deleteMTGCardPackageMutation = async (ID: string): Promise<boolean> =>
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

const addMTGCardToCardPackageMutation = async (input: MTG_AddCardToCardPackageInput): Promise<MTG_CardPackage> =>
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

const removeMTGCardFromCardPackageMutation = async (
    input: MTG_RemoveCardFromCardPackageInput,
): Promise<MTG_CardPackage> =>
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

const createTagMutation = async (input: CreateTagInput): Promise<string> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateTagArgs>(createTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const updateTagMutation = async (input: UpdateTagInput): Promise<string> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateTagArgs>(updateTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.updateTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const deleteTagMutation = async (ID: string): Promise<string> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteTagArgs>(deleteTag, { tagID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const assignTagMutation = async (input: AssignTagInput): Promise<boolean> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationassignTagArgs>(assignTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.assignTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const unassignTagMutation = async (input: UnassignTagInput): Promise<boolean> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationunassignTagArgs>(unassignTag, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.unassignTag)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const rateMutation = async (input: RateInput): Promise<string> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationrateArgs>(rate, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.rate)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

export const MTGFunctions = {
    queries: {
        getMTGCards: getMTGCardsQuery,
        getMTGDecks: getMTGDecksQuery,
        getMTGCardPackages: getMTGCardPackagesQuery,
        getMTGTags: getMTGTagsQuery,
    },
    mutations: {
        createMTGDeck: createMTGDeckMutation,
        deleteMTGDeck: deleteMTGDeckMutation,
        updateMTGDeck: updateMTGDeckMutation,
        saveMTGDeckAsCopy: saveMTGDeckAsCopyMutation,
        createMTGCardPackage: createMTGCardPackageMutation,
        deleteMTGCardPackage: deleteMTGCardPackageMutation,
        addMTGCardToCardPackage: addMTGCardToCardPackageMutation,
        removeMTGCardFromCardPackage: removeMTGCardFromCardPackageMutation,
        createTag: createTagMutation,
        updateTag: updateTagMutation,
        deleteTag: deleteTagMutation,
        assignTag: assignTagMutation,
        unassignTag: unassignTagMutation,
        rate: rateMutation,
    },
}
