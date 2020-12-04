import Eris, {
  Client,
  Collection,
  Guild,
  Member,
  Message,
  Role,
  User,
} from 'eris'
// import { omit } from 'lodash'
import {
  EC2,
  Credentials,
} from 'aws-sdk'

import Config from './Config'

const credentials = new Credentials({
  accessKeyId: Config.AWS_ACCESS_KEY_ID,
  secretAccessKey: Config.AWS_SECRET_ACCESS_KEY,
})

const ec2 = new EC2({
  credentials,
  region: 'ap-northeast-1',
  apiVersion: '2016-11-15',
  sslEnabled: true,
});

let ec2Instance

(async () => {
  try {
    const result = await ec2.describeInstances({
      Filters: [
        {
          Name: 'key-name',
          Values: [
            Config.EC2_INSTANCE_KEY_NAME,
          ],
        },
      ],
    }).promise()

    ec2Instance = result.Reservations?.[0]?.Instances?.[0] || null

    if (!ec2Instance) {
      throw new Error('No instance found!')
    }
    console.log(ec2Instance)
  } catch (e) {
    console.warn(e)
    throw new Error(e)
  }
})()

const client = Eris(Config.TOKEN)

const members = new Collection(Member)
const users = new Collection(User)
const roles = new Collection(Role)

// const omitGuild = (record: any) => omit(record, 'guild')

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

    if (message.mentions.some(user => user.id === Config.CLIENT_ID)) {
      const r = (content: string) => reply(client, message, content)

      const sanitisedMessage = message.content.replace(new RegExp(`<@!${Config.CLIENT_ID}>`), '').trim().toLowerCase()

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
