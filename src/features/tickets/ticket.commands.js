import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, OverwriteType, Events } from "discord.js";
import db, { getConfig } from "../../db.js";

export const getSlashData = () => [
  new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Ticket system")
    .addSubcommand(s=>s.setName("panel_create").setDescription("Create a ticket panel")
      .addStringOption(o=>o.setName("name").setDescription("Panel name").setRequired(true))
      .addChannelOption(o=>o.setName("category").setDescription("Category for tickets").addChannelTypes(ChannelType.GuildCategory).setRequired(true))
      .addRoleOption(o=>o.setName("support_role").setDescription("Support role to ping").setRequired(true))
      .addChannelOption(o=>o.setName("transcript_channel").setDescription("Where to post transcripts").addChannelTypes(ChannelType.GuildText))
      .addIntegerOption(o=>o.setName("open_limit").setDescription("Max open tickets per user").setMinValue(1).setMaxValue(5).setRequired(false))
      .addStringOption(o=>o.setName("message").setDescription("Panel message (shown above button)").setRequired(true)))
    .addSubcommand(s=>s.setName("panel_send").setDescription("Send a panel to a channel")
      .addIntegerOption(o=>o.setName("panel_id").setDescription("ID from creation response").setRequired(true))
      .addChannelOption(o=>o.setName("channel").setDescription("Where to post").addChannelTypes(ChannelType.GuildText).setRequired(true)))
    .addSubcommand(s=>s.setName("open").setDescription("Open a ticket manually"))
    .addSubcommand(s=>s.setName("close").setDescription("Close the current ticket"))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .toJSON()
];

export const register = (client) => {
  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isButton()) return;
    if (!i.customId.startsWith("ticket:open:")) return;
    const panelId = Number(i.customId.split(":").pop());
    const panel = db.prepare("SELECT * FROM ticket_panels WHERE id=? AND guild_id=?").get(panelId, i.guildId);
    if (!panel) return i.reply({ content: "Panel not found.", ephemeral: true });

    // Enforce user open limit
    const count = db.prepare("SELECT COUNT(*) AS n FROM open_tickets WHERE guild_id=? AND user_id=? AND status='open'").get(i.guildId, i.user.id).n;
    if (count >= (panel.user_open_limit ?? 1)) {
      return i.reply({ content: `You already have ${count} open ticket(s).`, ephemeral: true });
    }

    const cat = await i.guild.channels.fetch(panel.category_id).catch(()=>null);
    if (!cat) return i.reply({ content: "Ticket category missing.", ephemeral: true });

    // Create channel
    const channel = await i.guild.channels.create({
      name: `ticket-${i.user.username}`.toLowerCase().slice(0, 90),
      type: ChannelType.GuildText,
      parent: cat.id,
      permissionOverwrites: [
        { id: i.guild.roles.everyone, deny: ["ViewChannel"] },
        { id: i.user.id, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] },
        ...(panel.support_role_id ? [{ id: panel.support_role_id, allow: ["ViewChannel","SendMessages","ReadMessageHistory"] }] : [])
      ]
    });

    db.prepare("INSERT INTO open_tickets (guild_id,user_id,channel_id,panel_id,status) VALUES (?,?,?,?,?)")
      .run(i.guildId, i.user.id, channel.id, panel.id, "open");

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket:close:${channel.id}`).setLabel("Close").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`ticket:transcript:${channel.id}`).setLabel("Transcript").setStyle(ButtonStyle.Secondary)
    );

    await channel.send({
      content: `<@${i.user.id}> ${panel.support_role_id ? `<@&${panel.support_role_id}>` : ""}`,
      embeds: [ new EmbedBuilder().setTitle("Support Ticket").setDescription(panel.message).setFooter({ text: `Panel #${panel.id}` }) ],
      components: [row]
    });

    await i.reply({ content: `Ticket created: ${channel}`, ephemeral: true });
  });

  client.on(Events.InteractionCreate, async (i) => {
    if (!i.isButton()) return;
    const [ns, action, channelId] = i.customId.split(":");
    if (ns !== "ticket") return;
    if (action === "close") {
      if (i.channelId !== channelId) return i.reply({ content: "Not allowed here.", ephemeral: true });
      db.prepare("UPDATE open_tickets SET status='closed' WHERE channel_id=?").run(channelId);
      await i.reply({ content: "Closing ticket…", ephemeral: true });
      setTimeout(()=> i.channel?.delete().catch(()=>{}), 1000);
    }
    if (action === "transcript") {
      const panel = db.prepare("SELECT panel_id FROM open_tickets WHERE channel_id=?").get(channelId);
      const p = panel ? db.prepare("SELECT * FROM ticket_panels WHERE id=?").get(panel.panel_id) : null;
      const transcriptCh = p?.transcript_channel_id ? await i.guild.channels.fetch(p.transcript_channel_id).catch(()=>null) : null;
      if (!transcriptCh) return i.reply({ content: "No transcript channel set.", ephemeral: true });
      const msgs = await i.channel.messages.fetch({ limit: 100 });
      const content = msgs.sort((a,b)=>a.createdTimestamp-b.createdTimestamp).map(m=>`[${new Date(m.createdTimestamp).toISOString()}] ${m.author.tag}: ${m.cleanContent}`).join("\n");
      await transcriptCh.send({ content: "Transcript (last 100 msgs):", files: [{ attachment: Buffer.from(content, "utf8"), name: `transcript-${channelId}.txt` }] });
      await i.reply({ content: "Transcript saved.", ephemeral: true });
    }
  });

  client.commands.set("ticket", {
    data: null,
    run: async (i) => {
      const sub = i.options.getSubcommand();
      if (sub === "panel_create") {
        const name = i.options.getString("name", true);
        const category = i.options.getChannel("category", true);
        const supportRole = i.options.getRole("support_role", true);
        const transcript = i.options.getChannel("transcript_channel", false);
        const limit = i.options.getInteger("open_limit") ?? 1;
        const message = i.options.getString("message", true);

        const info = {
          guild_id: i.guildId,
          name,
          message,
          category_id: category.id,
          support_role_id: supportRole.id,
          transcript_channel_id: transcript?.id ?? null,
          user_open_limit: limit
        };
        const insert = db.prepare("INSERT INTO ticket_panels (guild_id,name,message,category_id,support_role_id,transcript_channel_id,user_open_limit) VALUES (@guild_id,@name,@message,@category_id,@support_role_id,@transcript_channel_id,@user_open_limit)");
        const res = insert.run(info);
        const panelId = res.lastInsertRowid;
        return i.reply({ content: `Panel created with id **${panelId}**. Next: \`/ticket panel_send panel_id:${panelId}\``, ephemeral: true });
      }
      if (sub === "panel_send") {
        const panelId = i.options.getInteger("panel_id", true);
        const channel = i.options.getChannel("channel", true);
        const panel = db.prepare("SELECT * FROM ticket_panels WHERE id=? AND guild_id=?").get(panelId, i.guildId);
        if (!panel) return i.reply({ content: "Panel not found.", ephemeral: true });
        const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import("discord.js");
        const embed = new EmbedBuilder().setTitle(panel.name).setDescription(panel.message).setFooter({ text: `Panel #${panel.id}` });
        const btn = new ButtonBuilder().setCustomId(`ticket:open:${panel.id}`).setLabel("Open Ticket").setStyle(ButtonStyle.Primary);
        const row = new ActionRowBuilder().addComponents(btn);
        await channel.send({ embeds: [embed], components: [row] });
        return i.reply({ content: `Panel sent to ${channel}.`, ephemeral: true });
      }
      if (sub === "open") {
        // Button flow is preferred; this is a simple manual open using the first panel as default
        const panel = db.prepare("SELECT * FROM ticket_panels WHERE guild_id=? ORDER BY id LIMIT 1").get(i.guildId);
        if (!panel) return i.reply({ content: "No panels exist. Use `/ticket panel_create` first.", ephemeral: true });
        // Simulate click
        i.customId = `ticket:open:${panel.id}`;
        client.emit("interactionCreate", i);
      }
      if (sub === "close") {
        client.emit("interactionCreate", i);
      }
    }
  });
};
