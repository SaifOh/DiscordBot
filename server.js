const Discord = require('discord.js');
const {
    prefix,
    token,
} = require('./config.json');
const ytdl = require('ytdl-core');


const client = new Discord.Client();


client.login(token);
client.once('ready', () => {
    console.log('Bot online...');
});
client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

const queue = new Map();


client.on('message', async message => {
    if (message.author.bot) return;
    if (!message.content.startsWith(prefix)) return;

    const serverQueue = queue.get(message.guild.id);
    console.log(message.content)
    if (message.content.startsWith(`${prefix}play `) || message.content.startsWith(`${prefix}p `)) {
        execute(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}skip`) || message.content.startsWith(`${prefix}s`)) {
        skip(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}disconnect`)) {
        stop(message, serverQueue);
        return;
    } else if (message.content.startsWith(`${prefix}queue`) || message.content.startsWith(`${prefix}q`)) {
        var msg = "``` \n Current Music List: \n";

        //message.channel.send("```"+serverQueue.songs+"```"); 
        var c = 0;
        serverQueue.songs.forEach(i => {
            c++;
            console.log(i);
            msg = msg.concat(c + "-" + i.title + "\n");
        })
        msg = msg.concat("```");
        message.channel.send(msg)
        return;
    } else if (message.content.startsWith(`${prefix}remove `) || message.content.startsWith(`${prefix}r `)) {
        remove(message, serverQueue);
    } else if (message.content.startsWith(`${prefix}clear`)) {
        clear(message, serverQueue);
    }else {
        message.channel.send("You need to enter a valid command!");
    }

})


async function execute(message, serverQueue) {
    const args = message.content.split(" ");

    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
        return message.channel.send(
            "Join a channel first dummy."
        );
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
        return message.channel.send(
            "No perms to join/speak in voice"
        );
    }

    const songInfo = await ytdl.getInfo(args[1]);
    const song = {
        title: songInfo.videoDetails.title,
        url: songInfo.videoDetails.video_url,
    };

    if (!serverQueue) {
        // Creating the contract for our queue
        const queueConstruct = {
            textChannel: message.channel,
            voiceChannel: voiceChannel,
            connection: null,
            songs: [],
            volume: 5,
            playing: true,
        };
        // Setting the queue using our contract
        queue.set(message.guild.id, queueConstruct);
        // Pushing the song to our songs array
        queueConstruct.songs.push(song);

        try {
            // Here we try to join the voicechat and save our connection into our object.
            var connection = await voiceChannel.join();
            queueConstruct.connection = connection;
            // Calling the play function to start a song
            play(message.guild, queueConstruct.songs[0]);
        } catch (err) {
            // Printing the error message if the bot fails to join the voicechat
            console.log(err);
            queue.delete(message.guild.id);
            return message.channel.send(err);
        }
    } else {
        serverQueue.songs.push(song);
        console.log(serverQueue.songs);
        return message.channel.send(`${song.title} has been added to the queue!`);
    }
}



function play(guild, song) {
    const serverQueue = queue.get(guild.id);
    if (!song) {
        serverQueue.voiceChannel.leave();
        queue.delete(guild.id);
        return;
    }

    const dispatcher = serverQueue.connection
        .play(ytdl(song.url))
        .on("finish", () => {
            serverQueue.songs.shift();
            play(guild, serverQueue.songs[0]);
        })
        .on("error", error => console.error(error));
    dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
    serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}


//re-code this in a way you check count of songs in queue, start popping til you reach number you want to remove, pop it without pushing into a new queue. and there u go? xd
//idk  try to fix later thx.
//nvm, found out I can just use splice.
function remove(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to skip the current track..."
        );
    if (!serverQueue)
        return message.channel.send("Nothing's playing...");
    console.log(serverQueue.Songs);

    if (message.content.match(/-remove \d/) || message.content.match(/-r \d/)) {
        //var regex = new RegExp(prefix.replace(/[\-\_\$\.]/g, f => '\\'+f) + 'remove (\\d+)', 'g').exec(' e --remove 2 f')
        console.log("I'm here... trying to dequeue??")
        try{
            serverQueue.songs.splice(message.content.match(/\d/)-1,1);
            message.channel.send("Song removed from queue!");
        }
        catch(err){
            message.channel.send("Error: "+err);
        }
        
    }
    //serverQueue.connection.dispatcher.end();
}

function clear(message,serverQueue){
    //console.log(serverQueue.songs.size());
        serverQueue.songs = [];
    console.log(serverQueue.songs);
    message.channel.send("Cleared current queue");
}

function skip(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to skip the current track..."
        );
    if (!serverQueue)
        return message.channel.send("Nothing's playing...");
    serverQueue.connection.dispatcher.end();
}

function stop(message, serverQueue) {
    if (!message.member.voice.channel)
        return message.channel.send(
            "You have to be in a voice channel to stop the current track..."
        );

    if (!serverQueue)
        return message.channel.send("Nothing's playing...");

    serverQueue.songs = [];
    serverQueue.connection.dispatcher.end();
}