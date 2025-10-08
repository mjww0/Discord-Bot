import { Events } from "discord.js";
import { getConfig } from "../../db.js";
import ms from "ms";

export default null;

export const attachAutoMod = (client) => {
  const warnCounts = new Map(); // key: guild-user, value: warns in the last session
  client.on(Events.MessageCreate, async (m) => {
    if (!m.guild || m.author.bot) return;
    const cfg = getConfig(m.guild.id);
    if (!cfg.automod_enabled) return;

    const key = `${m.guild.id}:${m.author.id}`;
    const badwords = JSON.parse(cfg.automod_badwords || "[]");
    const content = m.content.toLowerCase();

    const isInvite = cfg.automod_block_invites && /(discord\.gg|discord\.com\/invite)/i.test(content);
    const isLink = cfg.automod_block_links && /(https?:\/\/)/i.test(content);
    const hasBad = badwords.some(w => w && content.includes(String(w).toLowerCase()));

    if (isInvite || isLink || hasBad) {
      await m.delete().catch(()=>{});
      const c = (warnCounts.get(key) ?? 0) + 1;
      warnCounts.set(key, c);
      await m.channel.send({ content: `<@${m.author.id}> message removed (${c}/3).` }).catch(()=>{});
      if (c >= 3) {
        const member = await m.guild.members.fetch(m.author.id).catch(()=>null);
        if (member) await member.timeout(ms("10m"), "Automod: repeated violations").catch(()=>{});
        warnCounts.set(key, 0);
      }
    }
  });
};
