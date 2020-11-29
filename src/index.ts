import Eris, { Message } from 'eris'

import Config from './Config'

const TOKEN = Config.TOKEN

if (!TOKEN) {
  throw new Error('No token found!')
}

const client = Eris(TOKEN)

client.on('ready', () => console.log('ready'))

client.on('messageCreate', (msg: Message) => { // When a message is created
    if (msg.content === '!ping') { // If the message content is '!ping'
        client.createMessage(msg.channel.id, 'Pong!')
        // Send a message in the same channel with 'Pong!'
    } else if(msg.content === '!pong') { // Otherwise, if the message is '!pong'
        client.createMessage(msg.channel.id, 'Ping!')
        // Respond with 'Ping!'
    }
})

client.connect()
