# Orbital Network Studio Bot

A plug-and-play Discord bot for owners who want **easy in-Discord configuration** and **clean feature panels**.

## Quick Start
1. Create a Discord Application + Bot at https://discord.com/developers/applications
   - Enable intents: Guilds, GuildMembers, GuildMessages, MessageContent, GuildVoiceStates
2. Download this repo, copy `.env.example` → `.env` and fill values.
3. Install deps and register commands:
```bash
npm i
npm run register:guild   # registers slash commands to your DEV_GUILD_ID for fast testing
npm run dev             # starts the bot
```
4. Invite URL scopes: `bot applications.commands`. Grant manage channels/roles, timeout, view audit log, connect/speak.

## Owner-friendly Setup
- `/setup` → guides you to set welcome channel/message and ticket defaults.
- Ticket Panels: `/ticket panel create`, `/ticket panel send`
- Welcome: `/welcome set-channel`, `/welcome set-message`, `/welcome preview`, `/welcome toggle`
- Moderation: `/mod kick|ban|timeout`, `/purge`
- AutoMod: bad-words, invites, links, spam guard
- Music: `/music play|skip|stop|queue`

SQLite DB file: `orbital.sqlite` (created automatically).
