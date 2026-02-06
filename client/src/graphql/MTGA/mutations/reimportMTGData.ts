import gql from 'graphql-tag'

export default gql`
    mutation reimportMTGData {
        reimportMTGData {
            started
            message
            inProgress
        }
    }
`
