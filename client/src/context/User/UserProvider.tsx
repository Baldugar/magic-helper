import { useState } from 'react'
import { User } from '../../graphql/types'
import { UserContext } from './UserContext'

// Mock user for now
const mockUser: User = {
    __typename: 'User',
    ID: '1',
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(mockUser)

    return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}
