import { fetchData } from '../../utils/functions/fetchData'
import {
    MTGA_Card,
    MTGA_CreateDeckInput,
    MTGA_Deck,
    MTGA_UpdateDeckInput,
    Mutation,
    MutationcreateMTGADeckArgs,
    MutationdeleteMTGADeckArgs,
    MutationupdateMTGADeckArgs,
    Query,
    QuerygetMTGADecksArgs,
} from '../types'
import createMTGADeck from './mutations/createMTGADeck'
import deleteMTGADeck from './mutations/deleteMTGADeck'
import getMTGACards from './queries/getMTGACards'
import getMTGADecks from './queries/getMTGADecks'

// ----- QUERIES -----

const getMTGACardsQuery = async (): Promise<MTGA_Card[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getMTGACards, undefined).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGACards)
            } else {
                reject('Failed to fetch MTGA cards')
            }
        })
    })

const getMTGADecksQuery = async (ID?: string): Promise<MTGA_Deck[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query, QuerygetMTGADecksArgs>(getMTGADecks, { deckID: ID }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGADecks)
            } else {
                reject('Failed to fetch MTGA decks')
            }
        })
    })

// ----- MUTATIONS -----

const createMTGADeckMutation = async (input: MTGA_CreateDeckInput): Promise<MTGA_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationcreateMTGADeckArgs>(createMTGADeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGADeck)
            } else {
                reject('Failed to fetch MTGA cards')
            }
        })
    })

const deleteMTGADeckMutation = async (ID: string): Promise<boolean> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationdeleteMTGADeckArgs>(deleteMTGADeck, { input: { deckID: ID } }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.deleteMTGADeck)
            } else {
                reject('Failed to fetch MTGA cards')
            }
        })
    })

const updateMTGADeckMutation = async (input: MTGA_UpdateDeckInput): Promise<MTGA_Deck> =>
    new Promise((resolve, reject) => {
        fetchData<Mutation, MutationupdateMTGADeckArgs>(createMTGADeck, { input }).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.createMTGADeck)
            } else {
                reject('Failed to fetch MTGA cards')
            }
        })
    })

export const MTGAFunctions = {
    queries: {
        getMTGACards: getMTGACardsQuery,
        getMTGADecks: getMTGADecksQuery,
    },
    mutations: {
        createMTGADeck: createMTGADeckMutation,
        deleteMTGADeck: deleteMTGADeckMutation,
        updateMTGADeck: updateMTGADeckMutation,
    },
}
