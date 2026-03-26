require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.GuildMember]
});

const PROGRESS_FILE = path.join(__dirname, 'data', 'onboarding-progress.json');

function ensureProgressFile() {
  const dataDir = path.join(__dirname, 'data');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function loadProgress() {
  ensureProgressFile();
  try {
    const raw = fs.readFileSync(PROGRESS_FILE, 'utf8');
    return JSON.parse(raw || '{}');
  } catch (error) {
    console.error('Fehler beim Laden der Progress-Datei:', error);
    return {};
  }
}

function saveProgress(progress) {
  try {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf8');
  } catch (error) {
    console.error('Fehler beim Speichern der Progress-Datei:', error);
  }
}

function getUserProgress(userId) {
  const progress = loadProgress();

  if (!progress[userId]) {
    progress[userId] = {
      beitrag: false,
      pflichttage: false,
      discord: false,
      team: false
    };
    saveProgress(progress);
  }

  return progress[userId];
}

function updateUserProgress(userId, key) {
  const progress = loadProgress();

  if (!progress[userId]) {
    progress[userId] = {
      beitrag: false,
      pflichttage: false,
      discord: false,
      team: false
    };
  }

  progress[userId][key] = true;
  saveProgress(progress);

  return progress[userId];
}

function countCompleted(userProgress) {
  return Object.values(userProgress).filter(Boolean).length;
}

function buildButtons(userProgress) {
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('beitrag')
      .setLabel('💸 Jahresbeitrag verstanden')
      .setStyle(ButtonStyle.Success)
      .setDisabled(userProgress.beitrag),

    new ButtonBuilder()
      .setCustomId('pflichttage')
      .setLabel('📅 Pflichttage verstanden')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(userProgress.pflichttage)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('discord')
      .setLabel('📲 Discord-Aktivität verstanden')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(userProgress.discord),

    new ButtonBuilder()
      .setCustomId('team')
      .setLabel('🤝 Teamgedanke verstanden')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(userProgress.team)
  );

  return [row1, row2];
}

function buildProgressText(userProgress) {
  const done = (value) => (value ? '✅' : '⬜');

  return [
    `${done(userProgress.beitrag)} Jahresbeitrag verstanden`,
    `${done(userProgress.pflichttage)} Pflichttage verstanden`,
    `${done(userProgress.discord)} Discord-Aktivität verstanden`,
    `${done(userProgress.team)} Teamgedanke verstanden`
  ].join('\n');
}

function buildOnboardingEmbed(userProgress) {
  return new EmbedBuilder()
    .setTitle('🐺 Loco Onboarding')
    .setDescription('Geil, dass du jetzt Teil von **Loco Squad** bist. Hier kommen die wichtigsten Infos für deinen Start.')
    .addFields(
      {
        name: '💸 Jahresbeitrag',
        value:
          'Bei uns gibt es einen Jahresbeitrag von **12 €**.\n' +
          'Der wird für **Ligagebühren, Cups, Botkosten und allgemeine Teamkosten** genutzt.\n\n' +
          'Bitte per PayPal an **locosquadfc** schicken.'
      },
      {
        name: '📅 Pflichttage',
        value:
          '**Montag, Donnerstag und Sonntag** sind unsere festen Tage.\n\n' +
          'Privat geht immer vor. Schichtarbeit, Urlaub, Family oder Geburtstag ist alles verständlich.\n' +
          'Wenn du wirklich Teil von Loco sein willst, solltest du aber **mindestens 2 Pflichttage regelmäßig können** und idealerweise auch **1–2 Mal bei Cups oder Levelrunden** dabei sein.\n\n' +
          'Jeder Platz im Kader ist wertvoll.'
      },
      {
        name: '📲 Discord-Aktivität',
        value:
          '• Umfragen beantworten\n' +
          '• rechtzeitig absagen\n' +
          '• Ankündigungen lesen\n\n' +
          'Planung funktioniert nur, wenn jeder mitzieht.'
      },
      {
        name: '🤝 Teamgedanke',
        value:
          'Kein Ego-Film, kein Drama.\n' +
          'Wichtig sind **Respekt, Zuverlässigkeit und Zusammenhalt**.'
      },
      {
        name: '📝 Anmeldung & Registrierung',
        value:
          '**VPG**\n' +
          'https://virtualprogaming.com\n' +
          '→ Registrieren und dem VM den Benutzernamen schicken\n\n' +
          '**PL**\n' +
          'https://my.proleague.de/de/account/login\n' +
          '→ Account erstellen, Spieler erstellen, Transferanfrage an **Loco Squad**, Ingame dem Club beitreten, GameID einstellen, Alias korrekt setzen\n\n' +
          '**PLA**\n' +
          '→ Deine **PSN-ID / Xbox-ID / EA-ID** und **Trikotnummer** dem VM schicken\n\n' +
          '**RPL**\n' +
          'https://ifl-gaming.com/login/\n' +
          '→ Spieler erstellen, Team **Loco Squad**, Liga **RPL**, Season **RPL2 – Season 3**, danach VM ID oder Screenshot schicken'
      },
      {
        name: '📊 Dein aktueller Onboarding-Status',
        value: buildProgressText(userProgress)
      }
    );
}

client.once('clientReady', (client) => {
  ensureProgressFile();
  console.log(`✅ ${client.user.tag} ist online!`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const locoRoleId = process.env.LOCO_ROLE_ID;

    const hadRoleBefore = oldMember.roles.cache.has(locoRoleId);
    const hasRoleNow = newMember.roles.cache.has(locoRoleId);

    if (!hadRoleBefore && hasRoleNow) {
      const userProgress = getUserProgress(newMember.id);

      let dmSuccess = true;

      try {
        await newMember.send({
          content: 'Willkommen bei **Loco Squad** 🐺🔥',
          embeds: [buildOnboardingEmbed(userProgress)],
          components: buildButtons(userProgress)
        });
      } catch (err) {
        console.error('Fehler beim Senden der DM:', err);
        dmSuccess = false;
      }

      const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);

      if (logChannel) {
        await logChannel.send({
          content: dmSuccess
            ? `✅ Onboarding DM gesendet an <@${newMember.id}>`
            : `❌ Konnte keine DM senden an <@${newMember.id}> (DMs aus oder anderer Fehler)`
        });
      }
    }
  } catch (error) {
    console.error('Fehler bei guildMemberUpdate:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (!interaction.isButton()) return;

    const validButtons = {
      beitrag: '💸 Jahresbeitrag verstanden',
      pflichttage: '📅 Pflichttage verstanden',
      discord: '📲 Discord-Aktivität verstanden',
      team: '🤝 Teamgedanke verstanden'
    };

    const key = interaction.customId;
    const label = validButtons[key];

    if (!label) return;

    const currentProgress = getUserProgress(interaction.user.id);

    if (currentProgress[key]) {
      await interaction.reply({
        content: `✅ Diesen Punkt hast du bereits bestätigt: **${label}**`,
        flags: 64
      });
      return;
    }

    const updatedProgress = updateUserProgress(interaction.user.id, key);
    const completed = countCompleted(updatedProgress);
    const total = 4;

    await interaction.update({
      content: 'Willkommen bei **Loco Squad** 🐺🔥',
      embeds: [buildOnboardingEmbed(updatedProgress)],
      components: buildButtons(updatedProgress)
    });

    await interaction.followUp({
      content: `✅ Bestätigt: **${label}**\n📊 Fortschritt: **${completed}/${total}**`,
      flags: 64
    });

    const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);

    if (logChannel) {
      await logChannel.send({
        content: `🟢 <@${interaction.user.id}> hat bestätigt: **${label}**\n📊 Fortschritt: **${completed}/${total}**`
      });

      if (completed === total) {
        await logChannel.send({
          content: `🏁 <@${interaction.user.id}> hat das komplette Onboarding abgeschlossen.`
        });
      }
    }
  } catch (error) {
    console.error('Fehler bei Button-Interaktion:', error);

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.reply({
        content: '❌ Beim Verarbeiten des Buttons ist ein Fehler aufgetreten.',
        flags: 64
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);