import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import { Player } from "discord-player";

const players = new Map();

export const getSlashData = () => [
  new SlashCommandBuilder().setName("music").setDescription("Music controls")
    .addSubcommand(s=>s.setName("play").setDescription("Play a song or playlist").addStringOption(o=>o.setName("query").setDescription("URL or search").setRequired(true)))
    .addSubcommand(s=>s.setName("skip").setDescription("Skip current"))
    .addSubcommand(s=>s.setName("stop").setDescription("Stop & clear"))
    .addSubcommand(s=>s.setName("queue").setDescription("Show queue"))
    .toJSON()
];

export const register = (client) => {
  const getPlayer = (guildId) => {
    if (!players.has(guildId)) {
      players.set(guildId, new Player(client));
    }
    return players.get(guildId);
  };

  client.commands.set("music", {
    data: null,
    run: async (i) => {
      const sub = i.options.getSubcommand();
      const memberVc = i.member.voice.channel;
      if (!memberVc && sub !== "queue") return i.reply({ content: "Join a voice channel first.", ephemeral: true });

      const player = getPlayer(i.guildId);
      const queue = player.nodes.create(i.guild, {
        metadata: { channel: i.channel }
      });

      if (sub === "play") {
        const query = i.options.getString("query", true);
        await i.deferReply();
        const res = await player.search(query, { requestedBy: i.user });
        if (!res.hasTracks()) return i.followUp("No results.");
        await queue.connect(memberVc);
        res.playlist ? queue.addTrack(res.tracks) : queue.addTrack(res.tracks[0]);
        if (!queue.node.isPlaying()) await queue.node.play();
        return i.followUp(`Queued **${res.playlist ? res.playlist.title : res.tracks[0].title}**.`);
      }
      if (sub === "skip") {
        if (!queue.currentTrack) return i.reply({ content: "Nothing is playing.", ephemeral: true });
        await queue.node.skip();
        return i.reply({ content: "Skipped.", ephemeral: true });
      }
      if (sub === "stop") {
        if (!queue.currentTrack) return i.reply({ content: "Nothing is playing.", ephemeral: true });
        queue.delete();
        return i.reply({ content: "Stopped.", ephemeral: true });
      }
      if (sub === "queue") {
        if (!queue || (!queue.currentTrack && queue.size === 0)) return i.reply({ content: "Queue is empty.", ephemeral: true });
        const now = queue.currentTrack ? `Now: **${queue.currentTrack.title}**` : "";
        const next = queue.tracks.toArray().slice(0, 10).map((t, idx)=>`${idx+1}. ${t.title}`).join("\n");
        return i.reply({ content: [now, next].filter(Boolean).join("\n"), ephemeral: true });
      }
    }
  });
};
