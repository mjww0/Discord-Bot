import { SlashCommandBuilder, ChannelType, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } from "discord.js";
import { getConfig, setConfig } from "../../db.js";

export const getSlashData = () => [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("One-screen setup for welcome + ticket defaults")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .toJSON(),
  new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configure welcome system")
    .addSubcommand(s=>s.setName("set-channel").setDescription("Set welcome channel").addChannelOption(o=>o.setName("channel").setDescription("Channel").addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s=>s.setName("set-message").setDescription("Set welcome message").addStringOption(o=>o.setName("message").setDescription("Use {member} {server}").setRequired(true)))
    .addSubcommand(s=>s.setName("toggle").setDescription("Enable/disable welcome").addBooleanOption(o=>o.setName("enabled").setDescription("On?").setRequired(true)))
    .addSubcommand(s=>s.setName("preview").setDescription("Preview welcome message"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .toJSON()
];

export const register = (client) => {
  client.commands.set("setup", {
    data: null,
    run: async (i) => {
      if (!i.memberPermissions.has(PermissionFlagsBits.Administrator)) {
        return i.reply({ content: "Admin only.", ephemeral: true });
      }
      const cfg = getConfig(i.guildId);
      await i.reply({
        content: "**Setup**: Use the subcommands below to configure:
• `/welcome set-channel`
• `/welcome set-message`
• `/welcome toggle`
• `/ticket panel create` then `/ticket panel send`",
        ephemeral: true
      });
    }
  });

  client.commands.set("welcome", {
    data: null,
    run: async (i) => {
      const sub = i.options.getSubcommand();
      const gid = i.guildId;
      const cfg = getConfig(gid);
      if (sub === "set-channel") {
        const ch = i.options.getChannel("channel", true);
        setConfig(gid, { welcome_channel_id: ch.id });
        return i.reply({ content: `Welcome channel set to ${ch}.`, ephemeral: true });
      }
      if (sub === "set-message") {
        const msg = i.options.getString("message", true);
        setConfig(gid, { welcome_message: msg });
        return i.reply({ content: "Welcome message updated.", ephemeral: true });
      }
      if (sub === "toggle") {
        const enabled = i.options.getBoolean("enabled", true);
        setConfig(gid, { welcome_enabled: enabled ? 1 : 0 });
        return i.reply({ content: `Welcome ${enabled ? "enabled" : "disabled"}.`, ephemeral: true });
      }
      if (sub === "preview") {
        if (!cfg.welcome_channel_id) return i.reply({ content: "Set a welcome channel first.", ephemeral: true });
        const channel = await i.guild.channels.fetch(cfg.welcome_channel_id).catch(()=>null);
        const preview = (cfg.welcome_message || "Welcome {member} to {server}!")
          .replaceAll("{member}", i.member.toString())
          .replaceAll("{server}", i.guild.name);
        await channel?.send(preview);
        return i.reply({ content: "Preview sent.", ephemeral: true });
      }
    }
  });
};
