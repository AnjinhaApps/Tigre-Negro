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
  canalFilas: "",
  canalAnuncios: ""
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

// ===== EVENTO =====
client.on('interactionCreate', async interaction => {

  // ===== SLASH =====
  if (interaction.isChatInputCommand()) {

    if (interaction.commandName === 'configurar') {
      const embed = new EmbedBuilder()
        .setTitle('⚙️ Configuração do Sistema')
        .setDescription('Configure tudo abaixo:')
        .setColor('#6A0DAD');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('config_pix').setLabel('💳 PIX').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('config_pagamentos').setLabel('📥 Pagamentos').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('config_filas').setLabel('🎮 Filas').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('config_anuncios').setLabel('📢 Anúncios').setStyle(ButtonStyle.Secondary)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === 'pagamento') {
      const embed = new EmbedBuilder()
        .setTitle('💰 Sistema de Pagamento')
        .setDescription('Cadastro para jogadores ou registro para mediadores.')
        .setColor('Green');

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('cadastro').setLabel('📄 Cadastro').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('registrar_pagamento').setLabel('📢 Registrar Pagamento').setStyle(ButtonStyle.Success)
      );

      return interaction.reply({ embeds: [embed], components: [row] });
    }

    if (interaction.commandName === 'help') {
      return interaction.reply({
        content: `/configurar\n/painel\n/pagamento\n/ticket`,
        ephemeral: true
      });
    }
  }

  // ===== BOTÕES =====
  if (interaction.isButton()) {

    // ===== CONFIG =====
    if (interaction.customId === 'config_pix') {
      const modal = new ModalBuilder()
        .setCustomId('modal_pix')
        .setTitle('Configurar PIX');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('pix').setLabel('Chave PIX').setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.customId === 'config_anuncios') {
      const modal = new ModalBuilder()
        .setCustomId('modal_anuncios')
        .setTitle('Canal de Anúncios');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('canal').setLabel('ID do canal').setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    // ===== CADASTRO NORMAL =====
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

    // ===== REGISTRAR PAGAMENTO =====
    if (interaction.customId === 'registrar_pagamento') {

      if (!interaction.member.roles.cache.has(db.mediadorRole)) {
        return interaction.reply({ content: '❌ Apenas mediadores!', ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId('modal_registro')
        .setTitle('Registrar Pagamento');

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('valor').setLabel('Valor').setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('jogador').setLabel('Jogador').setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // ===== MODAIS =====
  if (interaction.type === InteractionType.ModalSubmit) {

    if (interaction.customId === 'modal_pix') {
      db.pix = interaction.fields.getTextInputValue('pix');
      salvarDB();
      return interaction.reply({ content: '✅ PIX salvo!', ephemeral: true });
    }

    if (interaction.customId === 'modal_anuncios') {
      db.canalAnuncios = interaction.fields.getTextInputValue('canal');
      salvarDB();
      return interaction.reply({ content: '📢 Canal de anúncios salvo!', ephemeral: true });
    }

    if (interaction.customId === 'modal_registro') {
      const valor = interaction.fields.getTextInputValue('valor');
      const jogador = interaction.fields.getTextInputValue('jogador');

      const canal = interaction.guild.channels.cache.get(db.canalAnuncios);

      if (canal) {
        canal.send({
          embeds: [
            new EmbedBuilder()
              .setTitle('💰 Pagamento Registrado')
              .addFields(
                { name: 'Jogador', value: jogador },
                { name: 'Valor', value: valor },
                { name: 'Mediador', value: `<@${interaction.user.id}>` }
              )
              .setColor('Green')
          ]
        });
      }

      return interaction.reply({ content: '✅ Pagamento registrado!', ephemeral: true });
    }
  }

});

client.login(config.token);
