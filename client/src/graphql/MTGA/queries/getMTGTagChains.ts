import gql from 'graphql-tag'

export default gql`
    query getMTGTagChains {
        getMTGTagChains {
            tag {
                ID
                name
                meta
            }
            chain {
                ID
                name
                meta
            }
            chainDisplay
        }
    }
`
