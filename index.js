require('dotenv').config();

const fs = require('fs');
const path = require('path');
const {
  Client,
  GatewayIntentBits,
  Partials,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  PermissionsBitField,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Channel]
});

const PROGRESS_FILE = path.join(__dirname, 'data', 'onboarding-progress.json');
const PAGE_SIZE = 25;

function ensureProgressFile() {
  const dir = path.dirname(PROGRESS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(PROGRESS_FILE)) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify({}, null, 2), 'utf8');
  }
}

function loadProgress() {
  ensureProgressFile();
  try {
    return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf8') || '{}');
  } catch (e) {
    console.error('Fehler beim Laden der Progress-Datei:', e);
    return {};
  }
}

function saveProgress(data) {
  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function getOrCreateUserState(userId) {
  const data = loadProgress();

  if (!data[userId]) {
    data[userId] = {
      startedBy: null,
      currentStep: 'none',
      completed: {
        basics_pflichttage: false,
        basics_discord: false,
        basics_team: false,
        basics_ready: false,
        basics: false,
        vpg: false,
        pl: false,
        rpl: false,
        pla: false,
        payment: false
      },
      needsHelp: {
        vpg: false,
        pl: false,
        rpl: false,
        pla: false,
        payment: false
      },
      finished: false,
      lastUpdatedAt: null
    };
    saveProgress(data);
  }

  return data[userId];
}

function updateUserState(userId, updater) {
  const data = loadProgress();
  if (!data[userId]) {
    data[userId] = {
      startedBy: null,
      currentStep: 'none',
      completed: {
        basics_pflichttage: false,
        basics_discord: false,
        basics_team: false,
        basics_ready: false,
        basics: false,
        vpg: false,
        pl: false,
        rpl: false,
        pla: false,
        payment: false
      },
      needsHelp: {
        vpg: false,
        pl: false,
        rpl: false,
        pla: false,
        payment: false
      },
      finished: false,
      lastUpdatedAt: null
    };
  }

  updater(data[userId]);
  data[userId].lastUpdatedAt = new Date().toISOString();
  saveProgress(data);

  return data[userId];
}

function resetUserState(userId) {
  const data = loadProgress();
  delete data[userId];
  saveProgress(data);
}

function getStepLabel(step) {
  const map = {
    none: 'Nicht gestartet',
    basics: 'Schritt 1/6: Basics',
    vpg: 'Schritt 2/6: VPG',
    pl: 'Schritt 3/6: PL',
    rpl: 'Schritt 4/6: RPL',
    pla: 'Schritt 5/6: PLA',
    payment: 'Schritt 6/6: Jahresbeitrag',
    done: 'Abgeschlossen'
  };
  return map[step] || step;
}

async function sendLog(message) {
  try {
    const channel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);
    if (channel) await channel.send({ content: message });
  } catch (e) {
    console.error('Fehler beim Loggen:', e);
  }
}

function isStaff(interaction) {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageGuild)
    || interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator);
}

function buildPanel() {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('panel_start')
      .setLabel('🚀 Onboarding starten')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId('panel_status')
      .setLabel('📊 Status prüfen')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId('panel_reset')
      .setLabel('🔁 Reset')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId('panel_help_cases')
      .setLabel('🆘 Hilfe-Fälle')
      .setStyle(ButtonStyle.Danger)
  );

  return {
    content: '## 🐺 Loco Onboarding Admin Panel\nWähle eine Aktion.',
    components: [row]
  };
}

function buildBasicsEmbed() {
  return new EmbedBuilder()
    .setTitle('Willkommen bei Loco Squad 🐺🔥')
    .setDescription(
      'Geil, dass du jetzt offiziell Teil vom Team bist.\n\n' +
      'Bei uns geht’s nicht einfach nur darum, ab und zu bisschen zu zocken. Wir wollen hier gemeinsam was aufbauen, besser werden und als Team auftreten. Damit du direkt sauber reinkommst, hier kurz die wichtigsten Basics.'
    )
    .addFields(
      {
        name: '📅 Pflichttage',
        value:
          'Unsere festen Tage sind **Montag, Donnerstag und Sonntag**.\n' +
          'Privatleben geht immer vor. Schichtarbeit, Urlaub, Familie, Geburtstag und sowas ist alles verständlich.\n' +
          'Wenn du wirklich Teil von Loco Squad sein willst, solltest du **mindestens 2 Pflichttage regelmäßig können** und idealerweise auch ab und zu bei Cups oder Levelrunden dabei sein.\n' +
          'Ein Platz im Kader ist wertvoll.'
      },
      {
        name: '📲 Discord-Aktivität',
        value:
          'Bitte schau regelmäßig auf den Server, beantworte Umfragen und lies wichtige Ankündigungen.\n' +
          'Gute Planung funktioniert nur, wenn jeder mitzieht und rechtzeitig Bescheid gibt.'
      },
      {
        name: '🤝 Teamgedanke',
        value:
          'Bei uns zählt das Team.\n' +
          'Kein Ego-Film, kein unnötiges Drama.\n' +
          'Wichtig sind Respekt, Zuverlässigkeit, Aktivität und dass jeder gemeinsam mitziehen will.'
      }
    );
}

function buildBasicsButtons(state) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('basics_pflichttage')
        .setLabel('📅 Pflichttage verstanden')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.completed.basics_pflichttage),

      new ButtonBuilder()
        .setCustomId('basics_discord')
        .setLabel('📲 Discord-Aktivität verstanden')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(state.completed.basics_discord),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('basics_team')
        .setLabel('🤝 Teamgedanke verstanden')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(state.completed.basics_team),

      new ButtonBuilder()
        .setCustomId('basics_ready')
        .setLabel('✅ Ich bin ready')
        .setStyle(ButtonStyle.Success)
        .setDisabled(state.completed.basics_ready),
    )
  ];
}

function basicsDone(state) {
  return state.completed.basics_pflichttage
    && state.completed.basics_discord
    && state.completed.basics_team
    && state.completed.basics_ready;
}

function buildStepEmbed(step) {
  const embeds = {
    vpg: new EmbedBuilder()
      .setTitle('Schritt 2/6 – VPG Anmeldung 🔥')
      .setDescription(
        'Jetzt geht’s mit der **VPG Registrierung** weiter.\n\n' +
        '**Was du machen musst:**\n' +
        '1. Geh auf **virtualprogaming.com**\n' +
        '2. Erstell dir dort einen Account\n' +
        '3. Wenn du fertig bist, schick deinem **VM von Loco Squad** deinen **Benutzernamen**\n\n' +
        'Wenn du das erledigt hast, bestätige es unten oder klick auf Hilfe nötig.'
      ),

    pl: new EmbedBuilder()
      .setTitle('Schritt 3/6 – Pro League Anmeldung 🅿️')
      .setDescription(
        'Jetzt kommt die **Pro League Registrierung**.\n\n' +
        '**Was du machen musst:**\n' +
        '1. Registriere dich auf **my.proleague.de**\n' +
        '2. Erstelle dort deinen **Spieler**\n' +
        '3. Stelle eine **Transferanfrage an Loco Squad**\n' +
        '4. Tritt auch **ingame in EA FC / Pro Clubs** dem Club **Loco Squad** bei\n' +
        '5. Stell danach deine **GameID** richtig ein\n' +
        '6. Achte darauf, dass dein **Alias** im Spiel klar zu deiner ID passt\n\n' +
        'Wenn du das erledigt hast, bestätige es unten oder klick auf Hilfe nötig.'
      ),

    rpl: new EmbedBuilder()
      .setTitle('Schritt 4/6 – RPL Anmeldung 🦁')
      .setDescription(
        'Jetzt kommt die **RPL Registrierung**.\n\n' +
        '**Was du machen musst:**\n' +
        '1. Geh auf **ifl-gaming.com**\n' +
        '2. Erstell dir dort einen Account\n' +
        '3. Erstelle deinen **Spieler**\n' +
        '4. Wähle als Team **Loco Squad**\n' +
        '5. Wähle als Liga **RPL**\n' +
        '6. Wähle die aktuelle Season **RPL2**\n' +
        '7. Schick danach deinem **VM** deine **ID oder einen Screenshot**\n\n' +
        'Wenn das erledigt ist, bestätige es unten oder klick auf Hilfe nötig.'
      ),

    pla: new EmbedBuilder()
      .setTitle('Schritt 5/6 – PLA Infos ⚡')
      .setDescription(
        'Für **PLA** musst du dich nicht groß irgendwo selbst anmelden, aber wir brauchen ein paar Daten von dir.\n\n' +
        '**Was du machen musst:**\n' +
        'Schick deinem **VM von Loco Squad** bitte:\n' +
        '1. deine **PSN-ID oder Xbox-ID oder EA-ID**\n' +
        '2. deine **Trikotnummer**\n\n' +
        'Wenn du das geschickt hast, bestätige es unten oder klick auf Hilfe nötig.'
      ),

    payment: new EmbedBuilder()
      .setTitle('Schritt 6/6 – Jahresbeitrag 💸')
      .setDescription(
        'Fast fertig. Jetzt fehlt noch der **Jahresbeitrag**.\n\n' +
        '**Infos dazu:**\n' +
        '• Betrag: **12 € pro Jahr**\n' +
        '• PayPal: **locosquadfc**\n' +
        '• Zweck: **Ligagebühren, Cups, Botkosten und allgemeine Teamkosten**\n\n' +
        '**Verwendungszweck:**\n' +
        'Bitte am besten deinen **Namen oder deine ID + Jahresbeitrag** dazuschreiben.\n\n' +
        'Wenn du den Beitrag gesendet hast, bestätige es unten oder klick auf Hilfe nötig.'
      ),

    done: new EmbedBuilder()
      .setTitle('Stark, du hast das komplette Loco Onboarding abgeschlossen 🐺🔥')
      .setDescription(
        'Damit bist du offiziell sauber durch alle wichtigen Schritte durch.\n\n' +
        'Willkommen bei **Loco Squad**.\n' +
        'Wenn noch irgendwo etwas offen ist oder du Fragen hast, meld dich einfach direkt bei deinem **VM**.\n\n' +
        'Ab jetzt heißt’s: mitziehen, aktiv sein und gemeinsam was reißen 🤝'
      )
  };

  return embeds[step];
}

function buildStepButtons(step) {
  if (step === 'done') return [];

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`done_${step}`)
        .setLabel('✅ Erledigt')
        .setStyle(ButtonStyle.Success),

      new ButtonBuilder()
        .setCustomId(`help_${step}`)
        .setLabel('🆘 Hilfe nötig')
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

async function sendBasicsDM(member) {
  const state = getOrCreateUserState(member.id);
  await member.send({
    content: 'Willkommen bei **Loco Squad** 🐺🔥',
    embeds: [buildBasicsEmbed()],
    components: buildBasicsButtons(state)
  });
}

async function sendStepDM(member, step) {
  await member.send({
    content: `## ${getStepLabel(step)}`,
    embeds: [buildStepEmbed(step)],
    components: buildStepButtons(step)
  });
}

function buildStatusText(userId, state) {
  return [
    `**User:** <@${userId}>`,
    `**Aktueller Schritt:** ${getStepLabel(state.currentStep)}`,
    `**Basics:** ${state.completed.basics ? '✅' : '⬜'}`,
    `**VPG:** ${state.completed.vpg ? '✅' : '⬜'} ${state.needsHelp.vpg ? '🆘' : ''}`,
    `**PL:** ${state.completed.pl ? '✅' : '⬜'} ${state.needsHelp.pl ? '🆘' : ''}`,
    `**RPL:** ${state.completed.rpl ? '✅' : '⬜'} ${state.needsHelp.rpl ? '🆘' : ''}`,
    `**PLA:** ${state.completed.pla ? '✅' : '⬜'} ${state.needsHelp.pla ? '🆘' : ''}`,
    `**Jahresbeitrag:** ${state.completed.payment ? '✅' : '⬜'} ${state.needsHelp.payment ? '🆘' : ''}`,
    `**Abgeschlossen:** ${state.finished ? '✅' : '⬜'}`,
    `**Zuletzt aktualisiert:** ${state.lastUpdatedAt || '—'}`
  ].join('\n');
}

async function startOnboardingForUser(guild, userId, startedById) {
  const member = await guild.members.fetch(userId);
  if (!member) throw new Error('Mitglied nicht gefunden.');

  updateUserState(userId, (state) => {
    state.startedBy = startedById;
    state.currentStep = 'basics';
    state.finished = false;
    state.completed = {
      basics_pflichttage: false,
      basics_discord: false,
      basics_team: false,
      basics_ready: false,
      basics: false,
      vpg: false,
      pl: false,
      rpl: false,
      pla: false,
      payment: false
    };
    state.needsHelp = {
      vpg: false,
      pl: false,
      rpl: false,
      pla: false,
      payment: false
    };
  });

  await sendBasicsDM(member);
  await sendLog(`✅ Onboarding manuell gestartet für <@${userId}> durch <@${startedById}>\n📍 <@${userId}> ist jetzt bei Schritt 1/6: Basics`);
}

async function showPlayerPicker(interaction, mode, query = '', page = 0) {
  const guild = interaction.guild;
  await guild.members.fetch();

  const allMembers = guild.members.cache
    .filter(m => !m.user.bot && m.roles.cache.has(process.env.LOCO_ROLE_ID))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));

  const q = query.trim().toLowerCase();

  const filtered = q
    ? allMembers.filter(m =>
        m.displayName.toLowerCase().includes(q) ||
        m.user.username.toLowerCase().includes(q) ||
        m.id.includes(q)
      )
    : allMembers;

  const totalPages = Math.max(1, Math.ceil(filtered.size / PAGE_SIZE));
  const safePage = Math.min(Math.max(page, 0), totalPages - 1);

  const items = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  if (!items.length) {
    const content = `Keine Spieler gefunden für Suchbegriff: **${query || 'leer'}**`;
    if (interaction.deferred || interaction.replied) {
      return interaction.editReply({ content, components: [] });
    }
    return interaction.reply({ content, flags: 64 });
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId(`pick_${mode}|${encodeURIComponent(query)}|${safePage}`)
    .setPlaceholder(`Spieler auswählen (${items.length} auf dieser Seite)`)
    .addOptions(
      items.map(member => ({
        label: member.displayName.slice(0, 100),
        description: `@${member.user.username}`.slice(0, 100),
        value: member.id
      }))
    );

  const navRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`page_${mode}|${encodeURIComponent(query)}|${safePage - 1}`)
      .setLabel('◀️ Zurück')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage === 0),

    new ButtonBuilder()
      .setCustomId(`page_${mode}|${encodeURIComponent(query)}|${safePage + 1}`)
      .setLabel('▶️ Weiter')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(safePage >= totalPages - 1)
  );

  const selectRow = new ActionRowBuilder().addComponents(select);

  const content =
    `**Modus:** ${mode}\n` +
    `**Suchbegriff:** ${query || '—'}\n` +
    `**Seite:** ${safePage + 1}/${totalPages}\n` +
    `Es werden nur Mitglieder mit der **Loco Squad** Rolle angezeigt.`;

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({ content, components: [selectRow, navRow] });
  }

  return interaction.reply({ content, components: [selectRow, navRow], flags: 64 });
}

async function showSearchModal(interaction, mode) {
  const modal = new ModalBuilder()
    .setCustomId(`modal_${mode}`)
    .setTitle('Spieler suchen');

  const input = new TextInputBuilder()
    .setCustomId('search_query')
    .setLabel('Name, Username oder ID')
    .setStyle(TextInputStyle.Short)
    .setRequired(false)
    .setPlaceholder('Leer lassen = alle Loco Spieler');

  modal.addComponents(new ActionRowBuilder().addComponents(input));
  await interaction.showModal(modal);
}

client.once('clientReady', (c) => {
  ensureProgressFile();
  console.log(`✅ ${c.user.tag} ist online!`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'onboarding-panel') {
        if (!isStaff(interaction)) {
          return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
        }

        return interaction.reply({
          ...buildPanel(),
          flags: 64
        });
      }
    }

    if (interaction.isButton()) {
      const id = interaction.customId;

      if (['panel_start', 'panel_status', 'panel_reset'].includes(id)) {
        if (!isStaff(interaction)) {
          return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
        }

        const mode = id.replace('panel_', '');
        return showSearchModal(interaction, mode);
      }

      if (id === 'panel_help_cases') {
        if (!isStaff(interaction)) {
          return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
        }

        const data = loadProgress();
        const helpUsers = Object.entries(data).filter(([, state]) =>
          Object.values(state.needsHelp || {}).some(Boolean)
        );

        if (!helpUsers.length) {
          return interaction.reply({
            content: '✅ Aktuell gibt es keine offenen Hilfe-Fälle.',
            flags: 64
          });
        }

        const text = helpUsers.map(([userId, state]) => {
          const helpSteps = Object.entries(state.needsHelp)
            .filter(([, val]) => val)
            .map(([key]) => key.toUpperCase())
            .join(', ');
          return `🆘 <@${userId}> braucht Hilfe bei: **${helpSteps}**`;
        }).join('\n');

        return interaction.reply({
          content: `## Offene Hilfe-Fälle\n${text}`,
          flags: 64
        });
      }

      if (id.startsWith('page_')) {
        if (!isStaff(interaction)) {
          return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
        }

        const [, payload] = id.split('page_');
        const [mode, encQuery, pageStr] = payload.split('|');
        const page = Number(pageStr) || 0;
        const query = decodeURIComponent(encQuery || '');

        await interaction.deferUpdate();
        return showPlayerPicker(interaction, mode, query, page);
      }

      // Basics Buttons
      if (['basics_pflichttage', 'basics_discord', 'basics_team', 'basics_ready'].includes(id)) {
        const userId = interaction.user.id;
        const state = getOrCreateUserState(userId);

        if (state.currentStep !== 'basics') {
          return interaction.reply({
            content: '❌ Dieser Schritt ist aktuell nicht aktiv.',
            flags: 64
          });
        }

        const updated = updateUserState(userId, (s) => {
          s.completed[id] = true;
          s.completed.basics = basicsDone({
            completed: {
              ...s.completed,
              [id]: true
            }
          });
        });

        await interaction.update({
          content: 'Willkommen bei **Loco Squad** 🐺🔥',
          embeds: [buildBasicsEmbed()],
          components: buildBasicsButtons(updated)
        });

        const fresh = getOrCreateUserState(userId);
        if (basicsDone(fresh) && !fresh.completed.basics) {
          updateUserState(userId, (s) => {
            s.completed.basics = true;
            s.currentStep = 'vpg';
          });

          await sendLog(`🟢 <@${userId}> hat Basics abgeschlossen\n📍 <@${userId}> ist jetzt bei Schritt 2/6: VPG`);

          const member = await interaction.guild.members.fetch(userId);
          await sendStepDM(member, 'vpg');
        }

        return;
      }

      // Step done / help
      if (id.startsWith('done_') || id.startsWith('help_')) {
        const [action, step] = id.split('_');
        const userId = interaction.user.id;
        const state = getOrCreateUserState(userId);

        if (state.currentStep !== step) {
          return interaction.reply({
            content: '❌ Dieser Schritt ist aktuell nicht aktiv.',
            flags: 64
          });
        }

        if (action === 'help') {
          updateUserState(userId, (s) => {
            s.needsHelp[step] = true;
          });

          await interaction.reply({
            content: '🆘 Alles klar. Wir haben gesehen, dass du Hilfe brauchst. Ein VM meldet sich bei dir.',
            flags: 64
          });

          await sendLog(`🆘 <@${userId}> braucht Hilfe bei ${getStepLabel(step)}`);
          return;
        }

        const nextStepMap = {
          vpg: 'pl',
          pl: 'rpl',
          rpl: 'pla',
          pla: 'payment',
          payment: 'done'
        };

        const next = nextStepMap[step];

        updateUserState(userId, (s) => {
          s.completed[step] = true;
          s.needsHelp[step] = false;
          s.currentStep = next;
          if (next === 'done') s.finished = true;
        });

        await interaction.update({
          content: `✅ Bestätigt: ${getStepLabel(step)}`,
          embeds: [buildStepEmbed(step)],
          components: []
        });

        await sendLog(`🟢 <@${userId}> hat ${step.toUpperCase()} erledigt`);

        const member = await interaction.guild.members.fetch(userId);

        if (next === 'done') {
          await sendStepDM(member, 'done');
          await sendLog(`🏁 <@${userId}> hat das komplette Onboarding abgeschlossen`);
        } else {
          await sendStepDM(member, next);
          await sendLog(`📍 <@${userId}> ist jetzt bei ${getStepLabel(next)}`);
        }

        return;
      }
    }

    if (interaction.isModalSubmit()) {
      if (!isStaff(interaction)) {
        return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
      }

      if (interaction.customId.startsWith('modal_')) {
        const mode = interaction.customId.replace('modal_', '');
        const query = interaction.fields.getTextInputValue('search_query') || '';

        await interaction.deferReply({ flags: 64 });
        return showPlayerPicker(interaction, mode, query, 0);
      }
    }

    if (interaction.isStringSelectMenu()) {
      if (!isStaff(interaction)) {
        return interaction.reply({ content: '❌ Keine Berechtigung.', flags: 64 });
      }

      if (interaction.customId.startsWith('pick_')) {
        const [, payload] = interaction.customId.split('pick_');
        const [mode] = payload.split('|');
        const userId = interaction.values[0];

        if (mode === 'start') {
          await interaction.deferUpdate();
          await startOnboardingForUser(interaction.guild, userId, interaction.user.id);
          return interaction.editReply({
            content: `✅ Onboarding wurde für <@${userId}> gestartet.`,
            components: []
          });
        }

        if (mode === 'status') {
          const state = getOrCreateUserState(userId);
          return interaction.update({
            content: `## Status\n${buildStatusText(userId, state)}`,
            components: []
          });
        }

        if (mode === 'reset') {
          resetUserState(userId);
          return interaction.update({
            content: `🔁 Onboarding-Status von <@${userId}> wurde zurückgesetzt.`,
            components: []
          });
        }
      }
    }
  } catch (error) {
    console.error('Interaction Fehler:', error);

    try {
      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: '❌ Es ist ein Fehler aufgetreten.',
          flags: 64
        });
      }
    } catch {}
  }
});

client.login(process.env.DISCORD_TOKEN);