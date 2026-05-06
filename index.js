// BOT DISCORD PERSONALIZADO - CORRIGIDO
// Compatível com discord.js v14

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
  ChannelType,
  PermissionsBitField,
  InteractionType,
  Routes
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
  try {
    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  } catch (err) {
    console.log('Erro ao ler database.json:', err);
  }
}

function salvarDB() {
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

function somenteAdmin(interaction) {
  return interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
}

// ===== CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== COMANDOS =====
const commands = [
  new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Configurar o bot'),

  new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Criar painel de fila')
    .addStringOption(option =>
      option
        .setName('dispositivo')
        .setDescription('PC / Mobile / Misto')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('equipe')
        .setDescription('1v1, 2v2, 3v3...')
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName('pagamento')
    .setDescription('Painel de pagamento'),

  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Painel de ticket'),

  new SlashCommandBuilder()
    .setName('help')
    .setDescription('Ver comandos')
].map(command => command.toJSON());

// ===== REGISTRAR COMANDOS =====
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    if (!config.token || !config.clientId || !config.guildId) {
      console.log('Configure TOKEN, CLIENT_ID e GUILD_ID nas variáveis de ambiente.');
      return;
    }

    console.log('Registrando comandos slash...');

    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('Comandos registrados com sucesso!');
  } catch (err) {
    console.log('Erro ao registrar comandos:', err);
  }
})();

// ===== READY =====
client.once('ready', () => {
  console.log(`${client.user.tag} está online!`);
});

// ===== INTERAÇÕES =====
client.on('interactionCreate', async interaction => {
  try {

    // ===== SLASH COMMANDS =====
    if (interaction.isChatInputCommand()) {

      // /CONFIGURAR
      if (interaction.commandName === 'configurar') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores podem usar este comando.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('⚙️ Configuração do Sistema')
          .setDescription(
            'Use os botões abaixo para configurar o bot.\n\n' +
            `💳 PIX atual: ${db.pix ? `\`${db.pix}\`` : '`Não configurado`'}\n` +
            `📢 Canal anúncios: ${db.canalAnuncios ? `<#${db.canalAnuncios}>` : '`Não configurado`'}\n` +
            `📥 Canal pagamentos: ${db.canalPagamentos ? `<#${db.canalPagamentos}>` : '`Não configurado`'}\n` +
            `🎮 Canal filas: ${db.canalFilas ? `<#${db.canalFilas}>` : '`Não configurado`'}\n` +
            `🛡️ Cargo mediador: ${db.mediadorRole ? `<@&${db.mediadorRole}>` : '`Não configurado`'}`
          )
          .setColor('#6A0DAD')
          .setFooter({ text: 'Sistema personalizado' });

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('config_pix')
            .setLabel('💳 PIX')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('config_anuncios')
            .setLabel('📢 Anúncios')
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId('config_pagamentos')
            .setLabel('📥 Pagamentos')
            .setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('config_filas')
            .setLabel('🎮 Filas')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('config_mediador')
            .setLabel('🛡️ Mediador')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row1, row2],
          ephemeral: true
        });
      }

      // /PAGAMENTO
      if (interaction.commandName === 'pagamento') {
        const embed = new EmbedBuilder()
          .setTitle('💰 Sistema de Pagamento')
          .setDescription(
            'Escolha uma opção abaixo:\n\n' +
            '📄 **Cadastro**: cadastrar dados de pagamento.\n' +
            '📢 **Registrar Pagamento**: registrar pagamento realizado.'
          )
          .setColor('Green');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('cadastro')
            .setLabel('📄 Cadastro')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('registrar_pagamento')
            .setLabel('📢 Registrar Pagamento')
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      // /PAINEL
      if (interaction.commandName === 'painel') {
        const dispositivo = interaction.options.getString('dispositivo');
        const equipe = interaction.options.getString('equipe');

        const embed = new EmbedBuilder()
          .setTitle('🎮 Fila Aberta')
          .setDescription(
            `📱 **Dispositivo:** ${dispositivo}\n` +
            `👥 **Equipe:** ${equipe}\n\n` +
            'Clique no botão abaixo para entrar na fila.'
          )
          .setColor('Blue')
          .setFooter({ text: 'Boa sorte!' });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`entrar_fila_${dispositivo}_${equipe}`)
            .setLabel('✅ Entrar na fila')
            .setStyle(ButtonStyle.Success)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      // /TICKET
      if (interaction.commandName === 'ticket') {
        const embed = new EmbedBuilder()
          .setTitle('🎫 Sistema de Tickets')
          .setDescription('Clique no botão abaixo para abrir um ticket de suporte.')
          .setColor('Orange');

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('abrir_ticket')
            .setLabel('🎫 Abrir Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row]
        });
      }

      // /HELP
      if (interaction.commandName === 'help') {
        return interaction.reply({
          content:
            '**📌 Comandos disponíveis:**\n\n' +
            '`/configurar` - Configurar o bot\n' +
            '`/painel` - Criar painel de fila\n' +
            '`/pagamento` - Criar painel de pagamento\n' +
            '`/ticket` - Criar painel de ticket\n' +
            '`/help` - Ver comandos',
          ephemeral: true
        });
      }
    }

    // ===== BOTÕES =====
    if (interaction.isButton()) {

      // CONFIG PIX
      if (interaction.customId === 'config_pix') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_pix')
          .setTitle('Configurar PIX');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('pix')
              .setLabel('Chave PIX')
              .setPlaceholder('Digite sua chave PIX')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG ANÚNCIOS
      if (interaction.customId === 'config_anuncios') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_anuncios')
          .setTitle('Canal de Anúncios');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('canal')
              .setLabel('ID do canal de anúncios')
              .setPlaceholder('Exemplo: 123456789012345678')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG PAGAMENTOS
      if (interaction.customId === 'config_pagamentos') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_pagamentos')
          .setTitle('Canal de Pagamentos');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('canal')
              .setLabel('ID do canal de pagamentos')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG FILAS
      if (interaction.customId === 'config_filas') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_filas')
          .setTitle('Canal de Filas');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('canal')
              .setLabel('ID do canal de filas')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG MEDIADOR
      if (interaction.customId === 'config_mediador') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_mediador')
          .setTitle('Cargo de Mediador');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('cargo')
              .setLabel('ID do cargo de mediador')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CADASTRO NORMAL
      if (interaction.customId === 'cadastro') {
        const modal = new ModalBuilder()
          .setCustomId('modal_cadastro')
          .setTitle('Cadastro');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('nome')
              .setLabel('Nome')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('pix')
              .setLabel('PIX')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('banco')
              .setLabel('Banco')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // REGISTRAR PAGAMENTO
      if (interaction.customId === 'registrar_pagamento') {
        if (db.mediadorRole && !interaction.member.roles.cache.has(db.mediadorRole)) {
          return interaction.reply({
            content: '❌ Apenas mediadores podem registrar pagamento.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_registro')
          .setTitle('Registrar Pagamento');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('valor')
              .setLabel('Valor')
              .setPlaceholder('Exemplo: R$ 10,00')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('jogador')
              .setLabel('Jogador')
              .setPlaceholder('Nome ou ID do jogador')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // ENTRAR FILA
      if (interaction.customId.startsWith('entrar_fila_')) {
        return interaction.reply({
          content: `✅ ${interaction.user} entrou na fila!`,
          ephemeral: false
        });
      }

      // ABRIR TICKET
      if (interaction.customId === 'abrir_ticket') {
        const existing = interaction.guild.channels.cache.find(
          channel => channel.name === `ticket-${interaction.user.username.toLowerCase()}`
        );

        if (existing) {
          return interaction.reply({
            content: `❌ Você já possui um ticket aberto: ${existing}`,
            ephemeral: true
          });
        }

        const canal = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: ChannelType.GuildText,
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ReadMessageHistory
              ]
            },
            {
              id: client.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageChannels
              ]
            }
          ]
        });

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('fechar_ticket')
            .setLabel('🔒 Fechar Ticket')
            .setStyle(ButtonStyle.Danger)
        );

        await canal.send({
          content: `${interaction.user}`,
          embeds: [
            new EmbedBuilder()
              .setTitle('🎫 Ticket Aberto')
              .setDescription('Explique seu problema. A equipe irá responder em breve.')
              .setColor('Blue')
          ],
          components: [row]
        });

        return interaction.reply({
          content: `✅ Ticket criado: ${canal}`,
          ephemeral: true
        });
      }

      // FECHAR TICKET
      if (interaction.customId === 'fechar_ticket') {
        if (!interaction.channel.name.startsWith('ticket-')) {
          return interaction.reply({
            content: '❌ Este botão só funciona em tickets.',
            ephemeral: true
          });
        }

        await interaction.reply({
          content: '🔒 Ticket será fechado em 5 segundos...',
          ephemeral: true
        });

        setTimeout(() => {
          interaction.channel.delete().catch(() => {});
        }, 5000);
      }
    }

    // ===== MODAIS =====
    if (interaction.type === InteractionType.ModalSubmit) {

      // SALVAR PIX
      if (interaction.customId === 'modal_pix') {
        db.pix = interaction.fields.getTextInputValue('pix');
        salvarDB();

        return interaction.reply({
          content: '✅ PIX salvo com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR CANAL ANÚNCIOS
      if (interaction.customId === 'modal_anuncios') {
        db.canalAnuncios = interaction.fields.getTextInputValue('canal');
        salvarDB();

        return interaction.reply({
          content: '📢 Canal de anúncios salvo com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR CANAL PAGAMENTOS
      if (interaction.customId === 'modal_pagamentos') {
        db.canalPagamentos = interaction.fields.getTextInputValue('canal');
        salvarDB();

        return interaction.reply({
          content: '📥 Canal de pagamentos salvo com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR CANAL FILAS
      if (interaction.customId === 'modal_filas') {
        db.canalFilas = interaction.fields.getTextInputValue('canal');
        salvarDB();

        return interaction.reply({
          content: '🎮 Canal de filas salvo com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR CARGO MEDIADOR
      if (interaction.customId === 'modal_mediador') {
        db.mediadorRole = interaction.fields.getTextInputValue('cargo');
        salvarDB();

        return interaction.reply({
          content: '🛡️ Cargo de mediador salvo com sucesso!',
          ephemeral: true
        });
      }

      // CADASTRO
      if (interaction.customId === 'modal_cadastro') {
        const nome = interaction.fields.getTextInputValue('nome');
        const pix = interaction.fields.getTextInputValue('pix');
        const banco = interaction.fields.getTextInputValue('banco');

        const canal = db.canalPagamentos
          ? interaction.guild.channels.cache.get(db.canalPagamentos)
          : null;

        const embed = new EmbedBuilder()
          .setTitle('📄 Novo Cadastro')
          .addFields(
            { name: 'Usuário', value: `${interaction.user}`, inline: false },
            { name: 'Nome', value: nome, inline: true },
            { name: 'PIX', value: pix, inline: true },
            { name: 'Banco', value: banco, inline: true }
          )
          .setColor('Blue')
          .setTimestamp();

        if (canal) {
          await canal.send({ embeds: [embed] });
        }

        return interaction.reply({
          content: '✅ Cadastro enviado com sucesso!',
          ephemeral: true
        });
      }

      // REGISTRAR PAGAMENTO
      if (interaction.customId === 'modal_registro') {
        const valor = interaction.fields.getTextInputValue('valor');
        const jogador = interaction.fields.getTextInputValue('jogador');

        const canal = db.canalAnuncios
          ? interaction.guild.channels.cache.get(db.canalAnuncios)
          : null;

        const embed = new EmbedBuilder()
          .setTitle('💰 Pagamento Registrado')
          .addFields(
            { name: 'Jogador', value: jogador, inline: true },
            { name: 'Valor', value: valor, inline: true },
            { name: 'Mediador', value: `<@${interaction.user.id}>`, inline: false }
          )
          .setColor('Green')
          .setTimestamp();

        if (canal) {
          await canal.send({ embeds: [embed] });
        }

        return interaction.reply({
          content: '✅ Pagamento registrado com sucesso!',
          ephemeral: true
        });
      }
    }

  } catch (err) {
    console.log('Erro na interação:', err);

    if (interaction.replied || interaction.deferred) {
      return interaction.followUp({
        content: '❌ Ocorreu um erro ao executar essa ação.',
        ephemeral: true
      });
    }

    return interaction.reply({
      content: '❌ Ocorreu um erro ao executar essa ação.',
      ephemeral: true
    });
  }
});

// ===== LOGIN =====
client.login(config.token);
