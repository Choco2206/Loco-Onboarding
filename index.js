require('dotenv').config();

const fs = require('fs');
const path = require('path');

const {
  Client,
  GatewayIntentBits,
  Partials,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
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
    '**Dein aktueller Onboarding-Status:**',
    `${done(userProgress.beitrag)} Jahresbeitrag verstanden`,
    `${done(userProgress.pflichttage)} Pflichttage verstanden`,
    `${done(userProgress.discord)} Discord-Aktivität verstanden`,
    `${done(userProgress.team)} Teamgedanke verstanden`
  ].join('\n');
}

function buildOnboardingMessage(userProgress) {
  return `
Willkommen bei **Loco Squad** 🐺🔥

Geil, dass du jetzt Teil vom Team bist. Ab jetzt geht’s nicht nur ums Zocken, sondern darum, gemeinsam was aufzubauen und besser zu werden.

---

**💸 Jahresbeitrag**  
Bei uns gibt es einen Jahresbeitrag von **12 €**.  
Der wird für Dinge wie **Ligagebühren, Cups, Botkosten und allgemeine Teamkosten** genutzt.  

Bitte per PayPal an **locosquadfc** schicken.

---

**📅 Pflichttage**  
Montag, Donnerstag und Sonntag sind unsere festen Tage.

Klar: Privat geht immer vor. Schichtarbeit, Urlaub, Family, Geburtstag und sowas ist alles easy, vollstes Verständnis.  
Aber wenn du wirklich Teil von Loco sein willst, solltest du **mindestens 2 Pflichttage regelmäßig können** und idealerweise auch **1–2 Mal bei Cups oder Levelrunden** dabei sein.

Jeder Platz im Kader ist wertvoll. Es bringt nichts, wenn man nur 1 Mal in 2 Wochen auftaucht.

---

**📲 Discord-Aktivität**  
Bitte regelmäßig auf den Server schauen:  
• Umfragen beantworten  
• rechtzeitig absagen, wenn du nicht kannst  
• Ankündigungen lesen  

Planung funktioniert nur, wenn jeder mitzieht.

---

**🤝 Teamgedanke**  
Bei uns zählt das Team.  
Kein Ego-Film, kein Drama.  
Wichtig sind **Respekt, Zuverlässigkeit und Zusammenhalt**.

---

**📝 Anmeldung & Registrierung**

**VPG**  
https://virtualprogaming.com  
→ Registrieren und deinem VM von Loco Squad den Benutzernamen schicken

---

**PL**  
Kurzfassung:  
• Account erstellen: https://my.proleague.de/de/account/login  
• Spieler erstellen  
• Transferanfrage an **Loco Squad** senden  
• Ingame dem Club beitreten  
• GameID einstellen  
• Alias korrekt setzen  

---

**PLA**  
→ Deine **PSN-ID / Xbox-ID / EA-ID** und deine **Trikotnummer** dem VM von Loco Squad schicken

---

**RPL**  
Kurzfassung:  
• https://ifl-gaming.com/login/  
• Spieler erstellen  
• Team: **Loco Squad**  
• Liga: **RPL**  
• Season: **RPL2 – Season 3**  
• Danach dem VM deine ID oder einen Screenshot schicken  

---

${buildProgressText(userProgress)}

Wenn du Fragen hast, meld dich einfach.  
Willkommen bei Loco 🤝🔥
`;
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
      const components = buildButtons(userProgress);
      const message = buildOnboardingMessage(userProgress);

      let dmSuccess = true;

      try {
        await newMember.send({
          content: message,
          components
        });
      } catch (err) {
        dmSuccess = false;
      }

      const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);

      if (logChannel) {
        await logChannel.send({
          content: dmSuccess
            ? `✅ Onboarding DM gesendet an <@${newMember.id}>`
            : `❌ Konnte keine DM senden an <@${newMember.id}> (DMs aus)`
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
        ephemeral: true
      });
      return;
    }

    const updatedProgress = updateUserProgress(interaction.user.id, key);
    const completed = countCompleted(updatedProgress);
    const total = 4;

    await interaction.update({
      content: buildOnboardingMessage(updatedProgress),
      components: buildButtons(updatedProgress)
    });

    await interaction.followUp({
      content: `✅ Bestätigt: **${label}**\n📊 Fortschritt: **${completed}/${total}**`,
      ephemeral: true
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
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);