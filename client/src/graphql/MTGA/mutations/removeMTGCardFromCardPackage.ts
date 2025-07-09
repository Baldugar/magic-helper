import gql from 'graphql-tag'
import { MTG_CardPackageFragments, MTG_TagFragments } from '../fragments'

export default gql`
    mutation removeMTGCardFromCardPackage($input: MTG_RemoveCardFromCardPackageInput!) {
        removeMTGCardFromCardPackage(input: $input) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
    ${MTG_TagFragments}
`
