import {
  Member,
  Role,
  User,
} from 'eris'

export interface IStore {
  // bot: Omit<Member, 'guild'> | null
  members: Map<string, Omit<Member, 'guild'>>
  users: Map<string, User>
  roles: Map<string, Omit<Role, 'guild'>>
}

export const store = {
  members: new Map(),
  users: new Map(),
  roles: new Map(),
}
