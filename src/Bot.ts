import {
  Client,
  Guild,
} from 'eris'
import { omit } from 'lodash'

import { IStore } from './Store'

const omitGuild = (record: any) => omit(record, 'guild')

export const updateMembersAndUsersAndRoles = (guild: Guild, store: IStore): void => {
  // store.bot = guild.members.filter(({ user }) => user.bot).map(omitGuild)?.[0] || null
  guild.members.filter(({ user }) => !user.bot).forEach(member => store.members.set(member.id, omitGuild(member)))
  store.members.forEach(({ user }) => store.users.set(user.id, user))
  guild.roles.forEach(role => store.roles.set(role.id, omitGuild(role)))
}

export const updateGuildState = (client: Client, store: IStore, guild?: Guild): void => {
  const g = guild || client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

  if (g) {
    updateMembersAndUsersAndRoles(g, store)
  }
}
