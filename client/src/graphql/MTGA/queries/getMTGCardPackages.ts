import gql from 'graphql-tag'
import { MTG_CardPackageFragments, MTG_TagFragments } from '../fragments'

export default gql`
    query getMTGCardPackages($cardPackageID: ID) {
        getMTGCardPackages(cardPackageID: $cardPackageID) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
    ${MTG_TagFragments}
`
