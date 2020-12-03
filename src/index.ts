import Eris, {
  Collection,
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

const client = Eris(TOKEN)

const members = new Collection(Member)
const users = new Collection(User)
const roles = new Collection(Role)

const omitGuild = (record: any) => omit(record, 'guild')

client
  .on('ready', () => {
    const guild = client.guilds.find(({ name }) => /miyaco.*minecraft/i.test(name))

    if (guild) {
      guild.members.filter(({ user }) => !user.bot).forEach(member => members.add(member))
      members.forEach(({ user }) => users.add(user))
      guild.roles.forEach(role => roles.add(role))
      console.log('ready', guild.name, members.map(omitGuild))
      // console.log(users, roles.map(omitGuild))
    }
  })
  .on('messageCreate', (message: Message) => {
    if (message.content === '!ping') {
      client.createMessage(message.channel.id, 'Pong!')
    } else if(message.content === '!pong') {
      client.createMessage(message.channel.id, 'Ping!')
    }
  })
  .connect()
