import Eris, {
  Guild,
  Message,
} from 'eris'

import Config from './Config'
import Instance from './Aws'
import { store } from './Store'
import {
  updateGuildState as originalUpdateGuildState,
  postMessage,
  hasRole as originalHasRole,
} from './Bot'

const client = Eris(Config.TOKEN)

const updateGuildState = (guild?: Guild) => originalUpdateGuildState(client, store, guild)
const post = (replyTo: Message, content: string, reply?: boolean) => postMessage(client, replyTo, content, reply)
const hasRole = (userId: string, roleName: string | string[]) => originalHasRole(store, userId, roleName)

const semaphore: Map<string, boolean> = new Map()
const processingTasks: Message[] = []

const semaphoredAction = async (semaphoreName: string, message: Message, action: Function): Promise<void> => {
  if (semaphore.get(semaphoreName)) {
    await post(message, 'Wait!', true)
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
    updateGuildState()

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
  .on('guildMemberRemove', updateGuildState)
  .on('guildMemberUpdate', updateGuildState)
  .on('guildRoleDelete', updateGuildState)
  .on('guildRoleUpdate', updateGuildState)
  .on('messageCreate', async (message: Message) => {
    updateGuildState()

    if (message.mentions.some(user => user.id === Config.CLIENT_ID)) {
      const r = (content: string) => post(message, content, true)
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

          await post(message, `${messageIds.length} ${messageIds.length === 1 ? 'message has' : 'messages have'} been deleted.`)
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
  .on('messageDelete', updateGuildState)
  .on('messageUpdate', updateGuildState)
  .connect()
