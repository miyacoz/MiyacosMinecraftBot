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

const client = Eris(Config.TOKEN)

const members: Map<string, Omit<Member, 'guild'>> = new Map()
const users: Map<string, User> = new Map()
const roles: Map<string, Omit<Role, 'guild'>> = new Map()

const omitGuild = (record: any) => omit(record, 'guild')

const updateState = (guild: Guild) => {
  guild.members.filter(({ user }) => !user.bot).forEach(member => members.set(member.id, omitGuild(member)))
  members.forEach(({ user }) => users.set(user.id, user))
  guild.roles.forEach(role => roles.set(role.id, omitGuild(role)))
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

const semaphore: Map<string, boolean> = new Map()
const processingTasks: Message[] = []

const hasRole = (userId: string, roleName: string | string[]): boolean => {
  const memberRoles = members.get(userId)?.roles

  if (!memberRoles) {
    return false
  }

  const roleId = [...roles.values()].find(role => role.name === roleName || roleName.includes(role.name))?.id

  if (!roleId) {
    return false
  }

  return memberRoles.includes(roleId)
}

client
  .on('ready', findGuildAndUpdateState)
  .on('guildMemberRemove', updateState)
  .on('guildMemberUpdate', updateState)
  .on('guildRoleDelete', updateState)
  .on('guildRoleUpdate', updateState)
  .on('messageCreate', async (message: Message) => {
    findGuildAndUpdateState()

    if (message.mentions.some(user => user.id === Config.CLIENT_ID)) {
      const r = (content: string) => post(client, message, content, true)
      const t = () => client.sendChannelTyping(message.channel.id)

      const sanitisedMessage = message.content.replace(new RegExp(`<@!${Config.CLIENT_ID}>`), '').trim().toLowerCase()

      // not using switch because some complex condition might be needed
      if (sanitisedMessage === 'status') {
        if (semaphore.get('status')) {
          await r('Wait!')
          await t()
          return
        }

        semaphore.set('status', true)
        processingTasks.push(message)

        const [result] = await Promise.all([
          Instance.getInfo(),
          t(),
        ])

        await new Promise(s => setTimeout(() => s(true), 5000))
        await r(`The server is now ${result.isAvailable ? 'available' : 'unavailable'} (${result.state.replace('-', ' ')}).`)

        semaphore.set('status', false)
        const index = processingTasks.findIndex(messageOfTask => messageOfTask.id === message.id)
        if (index >= 0) {
          processingTasks.splice(index, 1)
        }
      } else if (/^delete/.test(sanitisedMessage)) {
        if (hasRole(message.author.id, 'Discord Mod')) {
          await t()

          const limit = Number(sanitisedMessage.replace(/^delete /, '').trim().match(/^\d+/)?.[0])
          if (!limit) {
            await r('Please specify the number of messages to be deleted.')
            return
          }

          const messageIds = (await client.getMessages(message.channel.id, limit)).map(m => m.id)

          await client.deleteMessages(message.channel.id, messageIds)

          await post(client, message, `${messageIds.length} ${messageIds.length === 1 ? 'message has' : 'messages have'} been deleted.`)
        } else {
          await r('You do not have required roles.')
        }
      } else if (sanitisedMessage === 'ping') {
        await r('Pong!')
      } else if (sanitisedMessage === 'pong') {
        await r('Ping!')
      } else {
        await r('?')
      }

      if (processingTasks.length) {
        await t()
      }
    }
  })
  .on('messageDelete', findGuildAndUpdateState)
  .on('messageUpdate', findGuildAndUpdateState)
  .connect()
