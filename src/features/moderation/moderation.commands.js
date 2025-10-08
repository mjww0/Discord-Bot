import { SlashCommandBuilder, PermissionFlagsBits } from "discord.js";
import ms from "ms";

export const getSlashData = () => [
  new SlashCommandBuilder().setName("mod").setDescription("Moderation")
    .addSubcommand(s=>s.setName("kick").setDescription("Kick a member").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason")))
    .addSubcommand(s=>s.setName("ban").setDescription("Ban a member").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addStringOption(o=>o.setName("reason").setDescription("Reason")))
    .addSubcommand(s=>s.setName("timeout").setDescription("Timeout a member").addUserOption(o=>o.setName("user").setDescription("User").setRequired(true)).addStringOption(o=>o.setName("duration").setDescription("e.g. 10m, 2h")).addStringOption(o=>o.setName("reason").setDescription("Reason")))
    .addSubcommand(s=>s.setName("purge").setDescription("Delete N recent messages").addIntegerOption(o=>o.setName("count").setDescription("2-100").setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .toJSON()
];

export const register = (client) => {
  client.commands.set("mod", {
    data: null,
    run: async (i) => {
      const sub = i.options.getSubcommand();
      if (sub === "kick") {
        const user = i.options.getUser("user", true);
        const member = await i.guild.members.fetch(user.id).catch(()=>null);
        if (!member) return i.reply({ content: "Member not found.", ephemeral: true });
        await member.kick(i.options.getString("reason") ?? "No reason");
        return i.reply({ content: `Kicked ${user.tag}.`, ephemeral: true });
      }
      if (sub === "ban") {
        const user = i.options.getUser("user", true);
        await i.guild.members.ban(user.id, { reason: i.options.getString("reason") ?? "No reason" });
        return i.reply({ content: `Banned ${user.tag}.`, ephemeral: true });
      }
      if (sub === "timeout") {
        const user = i.options.getUser("user", true);
        const duration = ms(i.options.getString("duration") ?? "10m");
        if (!duration || duration < 1000) return i.reply({ content: "Invalid duration.", ephemeral: true });
        const member = await i.guild.members.fetch(user.id).catch(()=>null);
        if (!member) return i.reply({ content: "Member not found.", ephemeral: true });
        await member.timeout(duration, i.options.getString("reason") ?? "No reason");
        return i.reply({ content: `Timed out ${user.tag} for ${ms(duration, { long:true })}.`, ephemeral: true });
      }
      if (sub === "purge") {
        const count = i.options.getInteger("count", true);
        if (count < 2 || count > 100) return i.reply({ content: "Count must be 2–100.", ephemeral: true });
        const msgs = await i.channel.bulkDelete(count, true).catch(()=>null);
        return i.reply({ content: `Deleted ${msgs?.size ?? 0} messages.`, ephemeral: true });
      }
    }
  });
};
