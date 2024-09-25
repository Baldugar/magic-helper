import { fetchData } from '../../utils/fetchData'
import { MTGA_Card, Query } from '../types'
import getMTGACards from './queries/getMTGACards'

// ----- QUERIES -----

const getMTGACardsQuery = async (): Promise<MTGA_Card[]> =>
    new Promise((resolve, reject) => {
        fetchData<Query>(getMTGACards).then((response) => {
            if (response && response.data && !response.errors) {
                resolve(response.data.getMTGACards)
            } else {
                reject('Failed to fetch MTGA cards')
            }
        })
    })

export const MTGAFunctions = {
    queries: {
        getMTGACards: getMTGACardsQuery,
    },
}
