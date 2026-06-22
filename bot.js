import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { attachMessage, createRaid, getRaid, upsertSignup, withdrawSignup } from './store.js';
import { raidEmbed, roleSpecMenu, signupButtons } from './ui.js';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

async function refreshRaidMessage(raid, interaction) {
  const channel = await client.channels.fetch(raid.channelId);
  const message = await channel.messages.fetch(raid.messageId);
  await message.edit({ embeds: [raidEmbed(raid)], components: [signupButtons(raid.id)] });
  if (interaction && !interaction.replied && !interaction.deferred) {
    await interaction.reply({ content: 'Roster updated.', ephemeral: true });
  }
}

client.once('ready', () => {
  console.log(`RaidForge MVP logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  try {
    if (interaction.isChatInputCommand() && interaction.commandName === 'raid-create') {
      const title = interaction.options.getString('title', true);
      const starts = interaction.options.getString('starts', true);
      const note = interaction.options.getString('note') || '';

      const raid = createRaid({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
        messageId: null,
        title,
        starts,
        note,
        createdBy: interaction.user.id
      });

      await interaction.reply({ embeds: [raidEmbed(raid)], components: [signupButtons(raid.id)] });
      const message = await interaction.fetchReply();
      attachMessage(raid.id, message.id);
      return;
    }

    if (interaction.isButton()) {
      const [prefix, raidId, action] = interaction.customId.split(':');
      if (prefix !== 'raid') return;

      const raid = getRaid(raidId);
      if (!raid) return interaction.reply({ content: 'Raid not found.', ephemeral: true });

      if (action === 'withdraw') {
        const updated = withdrawSignup(raidId, interaction.user.id);
        await refreshRaidMessage(updated, interaction);
        return;
      }

      if (action === 'absent') {
        const updated = upsertSignup(raidId, {
          userId: interaction.user.id,
          status: 'ABSENT',
          role: null,
          className: null,
          spec: null
        });
        await refreshRaidMessage(updated, interaction);
        return;
      }

      const status = action === 'join' ? 'GOING' : action.toUpperCase();
      await interaction.reply({
        content: `Choose your role/spec for **${raid.title}**.`,
        components: [roleSpecMenu(raidId, status)],
        ephemeral: true
      });
      return;
    }

    if (interaction.isStringSelectMenu()) {
      const [prefix, raidId, kind, status] = interaction.customId.split(':');
      if (prefix !== 'raid' || kind !== 'spec') return;

      const [role, className, spec] = interaction.values[0].split('|');
      const updated = upsertSignup(raidId, {
        userId: interaction.user.id,
        status,
        role,
        className,
        spec
      });

      await interaction.update({ content: `Signed as **${status}**: ${spec} ${className}.`, components: [] });
      await refreshRaidMessage(updated);
    }
  } catch (error) {
    console.error(error);
    const content = 'Something went wrong. Check the bot logs.';
    if (interaction.replied || interaction.deferred) await interaction.followUp({ content, ephemeral: true });
    else await interaction.reply({ content, ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);
