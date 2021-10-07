const Discord = require("discord.js");
const { prefix, token } = require("./config.json");
const ytdl = require("ytdl-core");
const ytscrape = require("scrape-youtube").default;
const ytpl = require("ytpl");

const client = new Discord.Client();

client.login(token);
client.once("ready", () => {
  console.log("Bot online...");
});
client.once("reconnecting", () => {
  console.log("Reconnecting!");
});
client.once("disconnect", () => {
  console.log("Disconnect!");
});

const queue = new Map();

client.on("message", async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(prefix)) return;

  const serverQueue = queue.get(message.guild.id);
  console.log(message.content);
  if (
    message.content.startsWith(`${prefix}play `) ||
    message.content.startsWith(`${prefix}p `)
  ) {
    execute(message, serverQueue);
    return;
  } else if (
    message.content.startsWith(`${prefix}skip`) ||
    message.content.startsWith(`${prefix}s`)
  ) {
    skip(message, serverQueue);
    return;
  } else if (message.content.startsWith(`${prefix}disconnect`)) {
    stop(message, serverQueue);
    return;
  } else if (
    message.content.startsWith(`${prefix}queue`) ||
    message.content.startsWith(`${prefix}q`)
  ) {
    queue1(message, serverQueue);
    return;
  } else if (
    message.content.startsWith(`${prefix}remove `) ||
    message.content.startsWith(`${prefix}r `)
  ) {
    remove(message, serverQueue);
  } else if (message.content.startsWith(`${prefix}clear`)) {
    clear(message, serverQueue);
  } else if (message.content.startsWith(`${prefix}pause`)) {
    pause(message, serverQueue);
  } else if (message.content.startsWith(`${prefix}resume`)) {
    resume(message, serverQueue);
  } else {
    message.channel.send("You need to enter a valid command!");
  }
});


async function execute(message, serverQueue) {
  let args = message.content.split(" ");
  if (message.content.match(/^.*youtube.com\/watch\?v=\S{11}.*/i)) {
    const voiceChannel = message.member.voice.channel;
    if (!voiceChannel)
      return message.channel.send("Join a channel first dummy.");
    const permissions = voiceChannel.permissionsFor(message.client.user);
    if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
      return message.channel.send("No perms to join/speak in voice");
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
  //This checks if its a youtube playlist lol
  else if (message.content.match(/^.*youtube.com\/playlist\?list=P\S*/i)) {
    playlist(message, serverQueue);
  }

  //Else, it's probably a search query....
  else {
    search(message, serverQueue);
  }
}


async function playlist(message, serverQueue) {
  //Let's see if we can connect to voice channel first
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.channel.send("Join a channel first dummy.");
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send("No perms to join/speak in voice");
  }
  //Check if there's a serverQueue then decide what to do...
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    queue.set(message.guild.id, queueConstruct);

    let playlistID = message.content.slice(41);
    //console.log(playlistID);
    const playlists = await ytpl(playlistID, function (err) {
      if (err) throw err;
    });
    //console.log(playlists);
    for (item in playlists.items) {
      let videoID = item.id;
      const song = {
        title: playlists.items[item].title,
        url: playlists.items[item].url,
      };
      queueConstruct.songs.push(song);
    }
    console.log(queueConstruct);
    message.channel.send("Playlist is being queued.");
    console.log(message.client.songQueue);

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
    let playlistID = message.content.slice(41);
    console.log(playlistID);
    const playlists = await ytpl(playlistID, function (err) {
      if (err) throw err;
    });
    console.log(playlists);
    for (item in playlists.items) {
      let videoID = item.id;
      //const songInfo = await ytdl.getInfo(item);
      let song = {
        title: item.title,
        url: item.url,
      };
      //let videoID = playlist.items[item].id;
      serverQueue.songs.push(song);
      return message.channel.send(`${song.title} has been added to the queue!`);
    }
  }
}

async function search(message, serverQueue) {
  //Search Query check
  let query = message.content.replace(/^[\S]+[\s]+/, "");

  //Voice Channel checks
  const voiceChannel = message.member.voice.channel;
  if (!voiceChannel) return message.channel.send("Join a channel first dummy.");
  const permissions = voiceChannel.permissionsFor(message.client.user);
  if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
    return message.channel.send("No perms to join/speak in voice");
  }
  //Lets search first for the song see if it works
  var yvideo={
      title: '',
      url: '',
  };
  await ytscrape
    .search(query, {
      type: "video",
      limit: 1,
    })
    .then(
      function (results) {
        //console.log(results.videos);
        let videoID = results.videos[0].id;
        let videoURL = results.videos[0].link;
        let title = results.videos[0].title;
        yvideo = {
          title: title,
          url: videoURL,
        };
      },
      function (err) {
        console.log(err);
      }
    );

    const song = yvideo;
  //Check serverQueue
  if (!serverQueue) {
    const queueConstruct = {
      textChannel: message.channel,
      voiceChannel: voiceChannel,
      connection: null,
      songs: [],
      volume: 5,
      playing: true,
    };
    queue.set(message.guild.id, queueConstruct);
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
    message.channel.send("Adding `" + song.title + "` to the queue.");
  }
}


//Send the currently playing track & queue as a list
function queue1(message, serverQueue) {
  var msg = "``` \n Current Music List: \n";
  if (!serverQueue) {
    message.channel.send("Queue is empty");
    return;
  }
  else {
    var c = 0;
    serverQueue.songs.forEach((i) => {
      c++;
      console.log(i);
      msg = msg.concat(c + "-" + i.title + "\n");
    });
    msg = msg.concat("```");
    message.channel.send(msg);
    return;
  }
}

//Plays the music being requested by execute() on the bot
function play(guild, song) {
  const serverQueue = queue.get(guild.id);
  console.log(serverQueue);
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
    .on("error", (error) => console.error(error));
  dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
  serverQueue.textChannel.send(`Start playing: **${song.title}**`);
}

//Pauses the currently playing track
//*Currently is broken
function pause(guild, song) {
  const serverQueue = queue.get(guild.id);

  console.log(queue.get(guild.id));
  if (!song) {
    serverQueue.textChannel.send(`Nothing is playing.`);
    //serverQueue.voiceChannel.leave();
    queue.delete(guild.id);
    return;
  }
  console.log(serverQueue);
  serverQueue.playing = false;

  serverQueue.connection.dispatcher.pause();
  //serverQueue.connection.dispatcher.pause();
  serverQueue.textChannel.send(`Paused: **${song.title}**`);
}
//Resumes the currently playing track if paused
//*Currently is broken
function resume(guild, song) {
  const serverQueue = queue.get(guild.id);
  if (!song) {
    serverQueue.textChannel.send(`Nothing is playing.`);
    queue.delete(guild.id);
    return;
  }
  //or is it pause() again that flips the switch of silence?
  serverQueue.resume();

  serverQueue.textChannel.send(`Resume playing: **${song.title}**`);
}


//re-code this in a way you check count of songs in queue, start popping til you reach number you want to remove, pop it without pushing into a new queue. and there u go? xd
//idk  try to fix later thx.
//nvm, found out I can just use splice.
//Remove song at index from Queue
//var regex = new RegExp(prefix.replace(/[\-\_\$\.]/g, f => '\\'+f) + 'remove (\\d+)', 'g').exec(' e --remove 2 f')
function remove(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to skip the current track..."
    );
  if (!serverQueue) return message.channel.send("Nothing's playing...");
  console.log(serverQueue.Songs);

  if (message.content.match(/-remove \d+/) || message.content.match(/-r \d+/)) {
    
    console.log("I'm here... trying to dequeue??");
    try {
      serverQueue.songs.splice(message.content.match(/\d+/) - 1, 1);
      message.channel.send("Song removed from queue!");
    } catch (err) {
      message.channel.send("Error: " + err);
    }
  }
}

//Clears the current queue
function clear(message, serverQueue) {
  serverQueue.songs = [];
  console.log(serverQueue.songs);
  message.channel.send("Cleared current queue");
}

//Skips current playing track
function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to skip the current track..."
    );
  if (!serverQueue) return message.channel.send("Nothing's playing...");
  serverQueue.connection.dispatcher.end();
}

//Stops playing and disconnects
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "You have to be in a voice channel to stop the current track..."
    );

  if (!serverQueue) return message.channel.send("Nothing's playing...");

  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}
