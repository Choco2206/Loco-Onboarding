require('dotenv').config();

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

client.once('ready', () => {
  console.log(`✅ ${client.user.tag} ist online!`);
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
  try {
    const locoRoleId = process.env.LOCO_ROLE_ID;

    const hadRoleBefore = oldMember.roles.cache.has(locoRoleId);
    const hasRoleNow = newMember.roles.cache.has(locoRoleId);

    if (!hadRoleBefore && hasRoleNow) {

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId('beitrag')
          .setLabel('💸 Jahresbeitrag verstanden')
          .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
          .setCustomId('pflichttage')
          .setLabel('📅 Pflichttage verstanden')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('discord')
          .setLabel('📲 Discord-Aktivität verstanden')
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId('team')
          .setLabel('🤝 Teamgedanke verstanden')
          .setStyle(ButtonStyle.Secondary),
      );

      const message = `
Willkommen bei **Loco Squad** 🐺🔥

Geil, dass du jetzt Teil vom Team bist.

💸 Jahresbeitrag  
12 € pro Jahr für Liga, Cups & Teamkosten  
➡️ PayPal: locosquadfc

📅 Pflichttage  
Montag, Donnerstag, Sonntag  
➡️ Minimum 2x regelmäßig + optional Cups  

📲 Discord  
➡️ Umfragen beantworten  
➡️ rechtzeitig absagen  
➡️ aktiv bleiben  

🤝 Team  
➡️ kein Ego  
➡️ Respekt  
➡️ zusammen reißen  

📝 Anmeldung  
VPG: https://virtualprogaming.com  
PL: https://my.proleague.de  
RPL: https://ifl-gaming.com  

Willkommen bei Loco 🤝🔥
`;

      let dmSuccess = true;

      try {
        await newMember.send({
          content: message,
          components: [row]
        });
      } catch (err) {
        dmSuccess = false;
      }

      const logChannel = await client.channels.fetch(process.env.LOG_CHANNEL_ID);

      if (logChannel) {
        logChannel.send({
          content: dmSuccess
            ? `✅ Onboarding DM gesendet an <@${newMember.id}>`
            : `❌ Konnte keine DM senden an <@${newMember.id}> (DMs aus)`
        });
      }
    }

  } catch (error) {
    console.error('Fehler:', error);
  }
});

client.login(process.env.DISCORD_TOKEN);
