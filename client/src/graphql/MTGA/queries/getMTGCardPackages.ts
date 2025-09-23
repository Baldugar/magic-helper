import gql from 'graphql-tag'
import { MTG_CardPackageFragments } from '../fragments'

export default gql`
    query getMTGCardPackages($cardPackageID: ID, $includePublic: Boolean) {
        getMTGCardPackages(cardPackageID: $cardPackageID, includePublic: $includePublic) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
`
