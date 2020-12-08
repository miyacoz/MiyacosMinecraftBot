import Eris, {
  Client,
  Guild,
  Member,
  Message,
  Role,
  User,
} from 'eris'
import { omit } from 'lodash'

import Config from './Config'
import Instance from './Aws'

Instance.getInfo()

const client = Eris(Config.TOKEN)

const members: Set<Omit<Member, 'guild'>> = new Set()
const users: Set<User> = new Set()
const roles: Set<Omit<Role, 'guild'>> = new Set()

const omitGuild = (record: any) => omit(record, 'guild')

const updateState = (guild: Guild) => {
  guild.members.filter(({ user }) => !user.bot).forEach(member => members.add(omitGuild(member)))
  members.forEach(({ user }) => users.add(user))
  guild.roles.forEach(role => roles.add(omitGuild(role)))
}

const findGuildAndUpdateState = () => {
  const guild = client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

  if (guild) {
    updateState(guild)
  }
}

const post = (client: Client, message: Message, content: string, reply?: boolean): Promise<Message> =>
  // FIXME: restore eris version to dev/master
  client.createMessage(message.channel.id, {
    content,
    allowedMentions: {
      repliedUser: true,
    },
    messageReferenceID: reply ? message.id : undefined,
  })

client
  .on('ready', findGuildAndUpdateState)
  .on('guildMemberRemove', updateState)
  .on('guildMemberUpdate', updateState)
  .on('guildRoleDelete', updateState)
  .on('guildRoleUpdate', updateState)
  .on('messageCreate', async (message: Message) => {
    findGuildAndUpdateState()

    if (message.mentions.some(user => user.id === Config.CLIENT_ID)) {
      client.sendChannelTyping(message.channel.id)

      const r = (content: string) => post(client, message, content, true)

      const sanitisedMessage = message.content.replace(new RegExp(`<@!${Config.CLIENT_ID}>`), '').trim().toLowerCase()

      // not using switch because some complex condition might be needed
      if (sanitisedMessage === 'status') {
        const result = await Instance.getInfo()
        await r(`The server is now ${result.state.replace('-', ' ')}.`)
      } else if (sanitisedMessage === 'ping') {
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
