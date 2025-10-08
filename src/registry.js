import "dotenv/config";
import { REST, Routes } from "discord.js";
import { log } from "./util/logger.js";

// Each module exports getSlashData()
import * as Cfg from "./features/config/config.commands.js";
import * as Tix from "./features/tickets/ticket.commands.js";
import * as Mod from "./features/moderation/moderation.commands.js";
import * as Music from "./features/music/music.commands.js";

const all = [
  ...Cfg.getSlashData(),
  ...Tix.getSlashData(),
  ...Mod.getSlashData(),
  ...Music.getSlashData()
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const target = process.argv[2] || "guild";
const clientId = process.env.CLIENT_ID;
const guildId = process.env.DEV_GUILD_ID;

(async () => {
  if (!clientId) throw new Error("CLIENT_ID missing");
  if (target === "guild") {
    if (!guildId) throw new Error("DEV_GUILD_ID missing");
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: all });
    log(`Registered ${all.length} commands to guild ${guildId}`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: all });
    log(`Registered ${all.length} global commands`);
  }
})().catch(console.error);
