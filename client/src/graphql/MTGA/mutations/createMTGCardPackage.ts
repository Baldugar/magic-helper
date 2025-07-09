import gql from 'graphql-tag'
import { MTG_CardPackageFragments, MTG_TagFragments } from '../fragments'

export default gql`
    mutation createMTGCardPackage($input: MTG_CreateCardPackageInput!) {
        createMTGCardPackage(input: $input) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
    ${MTG_TagFragments}
`
