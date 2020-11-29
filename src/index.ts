import Eris, { Message } from 'eris'

import Config from './Config'

const TOKEN = Config.TOKEN

if (!TOKEN) {
  throw new Error('No token found!')
}

const eris = Eris(TOKEN)

eris.on('ready', () => console.log('ready'))

eris.on('messageCreate', (msg: Message) => { // When a message is created
    if (msg.content === '!ping') { // If the message content is '!ping'
        eris.createMessage(msg.channel.id, 'Pong!')
        // Send a message in the same channel with 'Pong!'
    } else if(msg.content === '!pong') { // Otherwise, if the message is '!pong'
        eris.createMessage(msg.channel.id, 'Ping!')
        // Respond with 'Ping!'
    }
})

eris.connect()
