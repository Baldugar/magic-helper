import { createContext } from 'react'
import { User } from '../../graphql/types'

export interface UserContextProps {
    user: User | null
    setUser: (user: User | null) => void
}

export const UserContext = createContext<UserContextProps>({
    user: null,
    setUser: () => {},
})
