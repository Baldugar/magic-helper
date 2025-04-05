import { fetchData } from '../../utils/functions/fetchData'
import {
    MTG_Card,
    MTG_CardListType,
    MTG_CreateDeckInput,
    MTG_Deck,
    MTG_UpdateDeckInput,
    Mutation,
    MutationcreateMTGDeckArgs,
    MutationdeleteMTGDeckArgs,
    MutationupdateMTGDeckArgs,
    Query,
    QuerygetMTGCardsArgs,
    QuerygetMTGDecksArgs,
} from '../types'
import createMTGDeck from './mutations/createMTGDeck'
import deleteMTGADeck from './mutations/deleteMTGDeck'
import saveMTGDeckAsCopy from './mutations/saveMTGDeckAsCopy'
import updateMTGDeck from './mutations/updateMTGDeck'
import getMTGCards from './queries/getMTGCards'
import getMTGDecks from './queries/getMTGDecks'

// ----- QUERIES -----

const getMTGCardsQuery = async (list: MTG_CardListType): Promise<MTG_Card[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGCardsArgs>(getMTGCards, { list }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGCards)
            } else {
                reject('Failed to fetch MTG cards')
            }
        })
    })

const getMTGDecksQuery = async (list: MTG_CardListType, ID?: string): Promise<MTG_Deck[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGDecksArgs>(getMTGDecks, { deckID: ID, list }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGDecks)
            } else {
                reject('Failed to fetch MTG decks')
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

const deleteMTGDeckMutation = async (ID: string, list: MTG_CardListType): Promise<boolean> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGDeckArgs>(deleteMTGADeck, { input: { deckID: ID, list } }).then(
            (response) => {
                if (response && response.data && !response.errors) {
                    resolve(response.data.deleteMTGDeck)
                } else {
                    reject('Failed to fetch MTG cards')
                }
            },
        )
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

export const MTGFunctions = {
    queries: {
        getMTGCards: getMTGCardsQuery,
        getMTGDecks: getMTGDecksQuery,
    },
    mutations: {
        createMTGDeck: createMTGDeckMutation,
        deleteMTGDeck: deleteMTGDeckMutation,
        updateMTGDeck: updateMTGDeckMutation,
        saveMTGDeckAsCopy: saveMTGDeckAsCopyMutation,
    },
}
