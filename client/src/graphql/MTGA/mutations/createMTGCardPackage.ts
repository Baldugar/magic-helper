import gql from 'graphql-tag'
import { MTG_CardPackageFragments } from '../fragments'

export default gql`
    mutation createMTGCardPackage($input: MTG_CreateCardPackageInput!) {
        createMTGCardPackage(input: $input) {
            ...MTG_CardPackageFragment
        }
    }
    ${MTG_CardPackageFragments}
`
