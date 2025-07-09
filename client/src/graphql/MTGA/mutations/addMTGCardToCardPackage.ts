import gql from 'graphql-tag'
import { MTG_CardPackageFragments, MTG_TagFragments } from '../fragments'

export default gql`
    mutation addMTGCardToCardPackage($input: MTG_AddCardToCardPackageInput!) {
        addMTGCardToCardPackage(input: $input) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
    ${MTG_TagFragments}
`
