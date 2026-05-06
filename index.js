const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  SlashCommandBuilder,
  Routes,
  InteractionType
} = require('discord.js');

const { REST } = require('@discordjs/rest');
const fs = require('fs');

// ===== CONFIG =====
const config = {
  token: process.env.TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID
};

// ===== DATABASE =====
let db = {
  pix: "",
  mediadorRole: "",
  canalPagamentos: "",
  canalFilas: ""
};

if (fs.existsSync('./database.json')) {
  db = JSON.parse(fs.readFileSync('./database.json'));
}

function salvarDB() {
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

// ===== CLIENT =====
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ===== COMANDOS =====
const commands = [

  new SlashCommandBuilder().setName('configurar').setDescription('Configurar o bot'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Criar fila')
    .addStringOption(o => o.setName('dispositivo').setRequired(true).setDescription('PC / Mobile / Misto'))
    .addStringOption(o => o.setName('equipe').setRequired(true).setDescription('1v1,2v2...')),

  new SlashCommandBuilder().setName('pagamento').setDescription('Painel de pagamento'),

  new SlashCommandBuilder().setName('ticket').setDescription('Painel de ticket'),

  new SlashCommandBuilder().setName('help').setDescription('Ver comandos')
];

// ===== REGISTRAR =====
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );
})();

// ===== EVENTOS =====
client.on('interactionCreate', async interaction => {

  // ===== SLASH =====
  if (interaction.isChatInputCommand()) {

    // CONFIGURAR
    if (interaction.commandName === 'configurar') {
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuração')
        .setDescription('Configure o sistema')
        .setColor('Purple');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('pix').setLabel('PIX').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('mediador').setLabel('Mediador').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('pagamentos').setLabel('Canal Pagamentos').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('filas').setLabel('Canal Filas').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // PAINEL FILA
    if (interaction.commandName === 'painel') {
      const dispositivo = interaction.options.getString('dispositivo');
      const equipe = interaction.options.getString('equipe');

      const embed = new EmbedBuilder()
        .setTitle('🎮 Nova Fila')
        .setDescription(`📱 ${dispositivo}\n👥 ${equipe}`)
        .setColor('Blue');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('entrar').setLabel('Entrar').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('sair').setLabel('Sair').setStyle(ButtonStyle.Danger)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // PAGAMENTO
    if (interaction.commandName === 'pagamento') {
      const embed = new EmbedBuilder()
        .setTitle('💰 Pagamento')
        .setDescription('Clique para se cadastrar')
        .setColor('Green');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cadastro').setLabel('Cadastro').setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // TICKET
    if (interaction.commandName === 'ticket') {
      const embed = new EmbedBuilder()
        .setTitle('🎟️ Suporte')
        .setDescription('Abra um ticket')
        .setColor('Yellow');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket').setLabel('Abrir').setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    // HELP
    if (interaction.commandName === 'help') {
      return interaction.reply({
        content: `
📜 Comandos:
/configurar
/painel
/pagamento
/ticket
/help
`,
        ephemeral: true
      });
    }
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {

    // CONFIG PIX
    if (interaction.customId === 'pix') {
      const modal = new ModalBuilder()
        .setCustomId('modal_pix')
        .setTitle('Configurar PIX');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('pix_input')
            .setLabel('Chave PIX')
            .setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // CADASTRO PAGAMENTO
    if (interaction.customId === 'cadastro') {
      const modal = new ModalBuilder()
        .setCustomId('modal_cadastro')
        .setTitle('Cadastro');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('nome').setLabel('Nome').setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('pix').setLabel('PIX').setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('banco').setLabel('Banco').setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ENTRAR FILA
    if (interaction.customId === 'entrar') {
      return interaction.reply({ content: 'Você entrou na fila!', ephemeral: true });
    }

    // SAIR FILA
    if (interaction.customId === 'sair') {
      return interaction.reply({ content: 'Você saiu da fila!', ephemeral: true });
    }

    // TICKET
    if (interaction.customId === 'ticket') {
      const canal = await interaction.guild.channels.create({
        name: `ticket-${interaction.user.username}`,
        type: 0
      });

      return interaction.reply({ content: `Ticket criado: ${canal}`, ephemeral: true });
    }
  }

  // ===== MODAIS =====
  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === 'modal_pix') {
      db.pix = interaction.fields.getTextInputValue('pix_input');
      salvarDB();
      return interaction.reply({ content: 'PIX configurado!', ephemeral: true });
    }

    if (interaction.customId === 'modal_cadastro') {
      const nome = interaction.fields.getTextInputValue('nome');
      const pix = interaction.fields.getTextInputValue('pix');
      const banco = interaction.fields.getTextInputValue('banco');

      const canal = interaction.guild.channels.cache.get(db.canalPagamentos);

      if (canal) {
        canal.send(`💰 Novo cadastro\nNome: ${nome}\nPIX: ${pix}\nBanco: ${banco}`);
      }

      return interaction.reply({ content: 'Cadastro enviado!', ephemeral: true });
    }
  }

});

client.login(config.token);
