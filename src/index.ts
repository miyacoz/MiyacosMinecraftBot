import Eris, {
  Collection,
  Guild,
  Member,
  Message,
  Role,
  User,
} from 'eris'
import { omit } from 'lodash'

import Config from './Config'

const TOKEN = Config.TOKEN

if (!TOKEN) {
  throw new Error('No token found!')
}

const BOT_ID = Config.CLIENT_ID

if (!BOT_ID) {
  throw new Error('No client id found!')
}

const client = Eris(TOKEN)

const members = new Collection(Member)
const users = new Collection(User)
const roles = new Collection(Role)

const omitGuild = (record: any) => omit(record, 'guild')

const updateState = (guild: Guild) => {
  guild.members.filter(({ user }) => !user.bot).forEach(member => members.add(member))
  members.forEach(({ user }) => users.add(user))
  guild.roles.forEach(role => roles.add(role))
  console.log('ready', guild.name, members.map(omitGuild))
  // console.log(users, roles.map(omitGuild))
}

const findGuildAndUpdateState = () => {
  const guild = client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

  if (guild) {
    updateState(guild)
  }
}

client
  .on('ready', findGuildAndUpdateState)
  .on('guildMemberRemove', updateState)
  .on('guildMemberUpdate', updateState)
  .on('guildRoleDelete', updateState)
  .on('guildRoleUpdate', updateState)
  .on('messageCreate', (message: Message) => {
    findGuildAndUpdateState()

    if (message.mentions.some(user => user.id === BOT_ID)) {
      const sanitisedMessage = message.content.replace(new RegExp(`<@!${BOT_ID}>`), '').trim().toLowerCase()
      console.log(sanitisedMessage)

      // inline replies https://github.com/abalabahaha/eris/issues/1084
      if (sanitisedMessage === 'ping') {
        client.createMessage(message.channel.id, 'Pong!')
      } else if (sanitisedMessage === 'pong') {
        client.createMessage(message.channel.id, 'Ping!')
      } else {
        client.createMessage(message.channel.id, '?')
      }
    }
  })
  .on('messageDelete', findGuildAndUpdateState)
  .on('messageUpdate', findGuildAndUpdateState)
  .connect()
