import Eris, {
  Client,
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
  // console.log(members.map(omitGuild))
  // console.log(users, roles.map(omitGuild))
}

const findGuildAndUpdateState = () => {
  const guild = client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

  if (guild) {
    updateState(guild)
  }
}

const reply = (client: Client, message: Message, content: string) =>
  // FIXME: restore eris version to dev/master
  client.createMessage(message.channel.id, {
    content,
    allowedMentions: {
      repliedUser: true,
    },
    messageReferenceID: message.id,
  })

client
  .on('ready', findGuildAndUpdateState)
  .on('guildMemberRemove', updateState)
  .on('guildMemberUpdate', updateState)
  .on('guildRoleDelete', updateState)
  .on('guildRoleUpdate', updateState)
  .on('messageCreate', (message: Message) => {
    findGuildAndUpdateState()

    if (message.mentions.some(user => user.id === BOT_ID)) {
      const r = (content: string) => reply(client, message, content)

      const sanitisedMessage = message.content.replace(new RegExp(`<@!${BOT_ID}>`), '').trim().toLowerCase()
      console.log(sanitisedMessage, message.id)

      if (sanitisedMessage === 'ping') {
        r('Pong!')
      } else if (sanitisedMessage === 'pong') {
        r('Ping!')
      } else {
        r('?')
      }
    }
  })
  .on('messageDelete', findGuildAndUpdateState)
  .on('messageUpdate', findGuildAndUpdateState)
  .connect()
