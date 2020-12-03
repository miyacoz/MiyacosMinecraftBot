import Eris, { Message } from 'eris'
import { omit } from 'lodash'

import Config from './Config'

const TOKEN = Config.TOKEN

if (!TOKEN) {
  throw new Error('No token found!')
}

const client = Eris(TOKEN)

client.on('ready', () => {
  const guild = client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

  if (guild) {
    const members = guild.members.filter(({ user }) => !user.bot).map(user => omit(user, ['guild', 'user']))
    const roles = guild.roles.map(role => omit(role, 'guild'))
    console.log('ready', guild.name, members, roles)
  }
})

client.on('messageCreate', (message: Message) => {
  if (message.content === '!ping') {
    client.createMessage(message.channel.id, 'Pong!')
  } else if(message.content === '!pong') {
    client.createMessage(message.channel.id, 'Ping!')
  }
})

client.connect()
