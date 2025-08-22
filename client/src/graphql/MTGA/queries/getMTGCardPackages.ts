import gql from 'graphql-tag'
import { MTG_CardPackageFragments } from '../fragments'

export default gql`
    query getMTGCardPackages($cardPackageID: ID) {
        getMTGCardPackages(cardPackageID: $cardPackageID) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
`
