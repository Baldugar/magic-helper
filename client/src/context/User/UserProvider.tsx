import { useState } from 'react'
import { User, UserRole } from '../../graphql/types'
import { UserContext } from './UserContext'

// Mock user for now
const mockUser: User = {
    __typename: 'User',
    ID: 'USER_ID',
    roles: [UserRole.ADMIN],
}

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<User | null>(mockUser)

    return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>
}
