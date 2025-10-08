import "dotenv/config";
import { Client, GatewayIntentBits, Partials, InteractionType, Events } from "discord.js";
import { log, err } from "./util/logger.js";
import { attachWelcome } from "./features/welcome/welcome.listener.js";
import { attachAutoMod } from "./features/automod/automod.listener.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel, Partials.GuildMember, Partials.Message]
});

client.commands = new Map();

// Load features
import("./features/config/config.commands.js").then(m => m.register(client));
import("./features/welcome/welcome.listener.js");
import("./features/tickets/ticket.commands.js").then(m => m.register(client));
import("./features/moderation/moderation.commands.js").then(m => m.register(client));
import("./features/automod/automod.listener.js");
import("./features/music/music.commands.js").then(m => m.register(client));

client.on(Events.InteractionCreate, async (i) => {
  if (i.type !== InteractionType.ApplicationCommand) return;
  const cmd = client.commands.get(i.commandName);
  if (!cmd) return;
  try {
    await cmd.run(i);
  } catch (e) {
    err(e);
    if (i.isRepliable()) {
      (i.replied || i.deferred)
        ? i.followUp({ content: "Command error.", ephemeral: true }).catch(() => {})
        : i.reply({ content: "Command error.", ephemeral: true }).catch(() => {});
    }
  }
});

client.once(Events.ClientReady, () => {
  log(`Logged in as ${client.user.tag}`);
  attachWelcome(client);
  attachAutoMod(client);
});

client.login(process.env.DISCORD_TOKEN);
export default client;
