import { Events } from "discord.js";
import { getConfig } from "../../db.js";
import { log } from "../../util/logger.js";

import clientModule from "../../index.js";

// This file relies on the global client via process; alternatively we register in index.js after import.
import { Client } from "discord.js";
// dummy export to keep ESM happy
export default {};

import("discord.js").then(() => {
  // Attach once client is ready; index.js already imports this file, so we hook onto process events.
});

export const attachWelcome = (client) => {
  client.on(Events.GuildMemberAdd, async (member) => {
    const cfg = getConfig(member.guild.id);
    if (!cfg.welcome_enabled || !cfg.welcome_channel_id) return;
    const channel = await member.guild.channels.fetch(cfg.welcome_channel_id).catch(()=>null);
    if (!channel) return;
    const msg = (cfg.welcome_message || "Welcome {member} to {server}!")
      .replaceAll("{member}", `<@${member.id}>`)
      .replaceAll("{server}", member.guild.name);
    await channel.send({ content: msg }).catch(()=>{});
  });
};
