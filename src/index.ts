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

// let bot: Omit<Member, 'guild'> | null
const members: Map<string, Omit<Member, 'guild'>> = new Map()
const users: Map<string, User> = new Map()
const roles: Map<string, Omit<Role, 'guild'>> = new Map()

const omitGuild = (record: any) => omit(record, 'guild')

const updateState = (guild: Guild): void => {
  // bot = guild.members.filter(({ user }) => user.bot).map(omitGuild)?.[0] || null
  guild.members.filter(({ user }) => !user.bot).forEach(member => members.set(member.id, omitGuild(member)))
  members.forEach(({ user }) => users.set(user.id, user))
  guild.roles.forEach(role => roles.set(role.id, omitGuild(role)))
}

const findGuildAndUpdateState = (): void => {
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

const semaphoredAction = async (semaphoreName: string, message: Message, action: Function): Promise<void> => {
  if (semaphore.get(semaphoreName)) {
    await post(client, message, 'Wait!', true)
    return
  }

  semaphore.set(semaphoreName, true)
  processingTasks.push(message)

  await action()

  semaphore.set(semaphoreName, false)
  const index = processingTasks.findIndex(messageOfTask => messageOfTask.id === message.id)
  if (index >= 0) {
    processingTasks.splice(index, 1)
  }
}

client
  .on('ready', async () => {
    findGuildAndUpdateState()

    /*
     * FIXME: enable this after eris starts supporting GATEWAY_VERSION = 8
    if (bot) {
      const result = await Instance.getInfo()
      await client.editStatus(bot.status, {
        name: `Server is ${result.isAvailable ? 'UP' : 'DOWN'} now`,
        type: 4,
      })
    }
     */
  })
  .on('guildMemberRemove', updateState)
  .on('guildMemberUpdate', updateState)
  .on('guildRoleDelete', updateState)
  .on('guildRoleUpdate', updateState)
  .on('messageCreate', async (message: Message) => {
    findGuildAndUpdateState()

    if (message.mentions.some(user => user.id === Config.CLIENT_ID)) {
      const r = (content: string) => post(client, message, content, true)
      const t = () => client.sendChannelTyping(message.channel.id)
      const isDiscordMod = hasRole(message.author.id, 'Discord Mod')
      const a = (s: string, a: Function) => semaphoredAction(s, message, a)

      const sanitisedMessage = message.content.replace(new RegExp(`<@!${Config.CLIENT_ID}>`), '').trim().toLowerCase()

      // not using switch because some complex condition might be needed
      if (sanitisedMessage === 'status') {
        await a('status', async (): Promise<void> => {
          const [result] = await Promise.all([
            Instance.getInfo(),
            t(),
          ])

          await new Promise(s => setTimeout(() => s(true), 5000))
          await r(`The server is now ${result.isAvailable ? 'available' : 'unavailable'} (${result.state.replace('-', ' ')}).`)
        })
      } else if (/^delete/.test(sanitisedMessage)) {
        if (!isDiscordMod) {
          await r('You do not have required roles.')
          return
        }

        await a('delete', async () => {
          await t()

          const limit = Number(sanitisedMessage.replace(/^delete /, '').trim().match(/^\d+/)?.[0])
          if (!limit) {
            await r('Please specify the number of messages to be deleted.')
            return
          }

          const messageIds = (await client.getMessages(message.channel.id, limit)).map(m => m.id)

          await client.deleteMessages(message.channel.id, messageIds)

          await post(client, message, `${messageIds.length} ${messageIds.length === 1 ? 'message has' : 'messages have'} been deleted.`)
        })
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
