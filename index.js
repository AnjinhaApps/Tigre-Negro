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
  canalAnuncios: "",

  ticket: {
    canalPainel: "",
    titulo: "🎫 Sistema de Tickets",
    mensagem: "Clique no botão abaixo para abrir um ticket de suporte.",
    imagem: "",
    botaoLabel: "🎫 Abrir Ticket",
    botaoEmoji: "🎫",
    botaoCor: "Danger",
    categoria: ""
  },

  ap: {
    canalPainel: "",
    mensagem: "FILAS ON",
    equipe: "1v1",
    dispositivo: "Mobile",
    valorMin: 0.30,
    valorMax: 1.00,
    imagem: ""
  },

  filas: {}
};

if (fs.existsSync('./database.json')) {
  try {
    db = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
  } catch (err) {
    console.log('Erro ao ler database.json:', err);
  }
}

if (!db.ticket) {
  db.ticket = {
    canalPainel: "",
    titulo: "🎫 Sistema de Tickets",
    mensagem: "Clique no botão abaixo para abrir um ticket de suporte.",
    imagem: "",
    botaoLabel: "🎫 Abrir Ticket",
    botaoEmoji: "🎫",
    botaoCor: "Danger",
    categoria: ""
  };
}

if (!db.ap) {
  db.ap = {
    canalPainel: "",
    mensagem: "FILAS ON",
    equipe: "1v1",
    dispositivo: "Mobile",
    valorMin: 0.30,
    valorMax: 1.00,
    imagem: ""
  };
}

if (!db.filas) {
  db.filas = {};
}

function salvarDB() {
  fs.writeFileSync('./database.json', JSON.stringify(db, null, 2));
}

function estiloBotaoTicket() {
  const estilos = {
    Primary: ButtonStyle.Primary,
    Secondary: ButtonStyle.Secondary,
    Success: ButtonStyle.Success,
    Danger: ButtonStyle.Danger
  };

  return estilos[db.ticket.botaoCor] || ButtonStyle.Danger;
}

function montarPainelTicket() {
  const embed = new EmbedBuilder()
    .setTitle(db.ticket.titulo || "🎫 Sistema de Tickets")
    .setDescription(db.ticket.mensagem || "Clique no botão abaixo para abrir um ticket de suporte.")
    .setColor("Orange");

  if (db.ticket.imagem) {
    embed.setImage(db.ticket.imagem);
  }

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_ticket")
      .setLabel(db.ticket.botaoLabel || "Abrir Ticket")
      .setStyle(estiloBotaoTicket())
  );

  return { embeds: [embed], components: [row] };
}


function formatarValorBR(valor) {
  return `R$ ${Number(valor).toFixed(2).replace('.', ',')}`;
}

function chaveValor(valor) {
  return Number(valor).toFixed(2).replace('.', '_');
}

function gerarValoresPainel(min, max) {
  const valores = [];
  let atual = Number(min);

  if (Number.isNaN(atual) || Number.isNaN(Number(max))) return valores;
  if (atual <= 0 || Number(max) < atual) return valores;

  while (atual <= Number(max) + 0.0001) {
    valores.push(Number(atual.toFixed(2)));

    if (atual < 1) {
      atual += 0.20;
    } else if (atual < 10) {
      atual += 1;
    } else if (atual < 50) {
      atual += 10;
    } else {
      atual += 50;
    }
  }

  return valores;
}

function normalizarEquipe(equipe) {
  const valor = String(equipe || "1v1").toLowerCase().replace(/\s/g, "");
  const permitidos = ["1v1", "2v2", "3v3", "4v4"];
  return permitidos.includes(valor) ? valor : "1v1";
}

function normalizarDispositivo(dispositivo) {
  const valor = String(dispositivo || "Mobile").toLowerCase();

  if (valor.includes("pc")) return "PC";
  if (valor.includes("misto")) return "Misto";
  return "Mobile";
}

function montarIdFila(equipe, dispositivo, valor) {
  return `${normalizarEquipe(equipe)}_${normalizarDispositivo(dispositivo).toLowerCase()}_${chaveValor(valor)}`;
}

function obterFila(id) {
  if (!db.filas[id]) {
    db.filas[id] = {
      jogadores: {}
    };
  }

  if (!db.filas[id].jogadores) {
    db.filas[id].jogadores = {};
  }

  return db.filas[id];
}

function textoJogadoresFila(fila) {
  const entradas = Object.entries(fila.jogadores || {});

  if (entradas.length === 0) {
    return "Sem jogadores...";
  }

  return entradas
    .map(([userId, botao]) => `<@${userId}> — \`${botao}\``)
    .join("\\n");
}

function montarPainelAP({ equipe, dispositivo, valor, filaId }) {
  const fila = obterFila(filaId);
  const dispositivoFinal = normalizarDispositivo(dispositivo);
  const equipeFinal = normalizarEquipe(equipe);

  const embed = new EmbedBuilder()
    .setTitle(`${equipeFinal} | Fila`)
    .setDescription(
      `📱 Formato: \`${equipeFinal} ${dispositivoFinal}\`\\n` +
      `💰 Preço: \`${formatarValorBR(valor)}\`\\n\\n` +
      `👑 **Jogadores**\\n${textoJogadoresFila(fila)}`
    )
    .setColor("#00d4d8");

  if (db.ap.imagem) {
    embed.setThumbnail(db.ap.imagem);
  }

  const botoes = [
    new ButtonBuilder()
      .setCustomId(`ap_join_${filaId}_Normal`)
      .setLabel("Normal")
      .setEmoji("📱")
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`ap_join_${filaId}_Full_Ump_Xm8`)
      .setLabel("Full Ump Xm8")
      .setEmoji("🔫")
      .setStyle(ButtonStyle.Success)
  ];

  if (dispositivoFinal === "Mobile") {
    botoes.push(
      new ButtonBuilder()
        .setCustomId(`ap_join_${filaId}_Mobilador`)
        .setLabel("Mobilador")
        .setEmoji("📚")
        .setStyle(ButtonStyle.Success)
    );
  }

  botoes.push(
    new ButtonBuilder()
      .setCustomId(`ap_sair_${filaId}`)
      .setLabel("Sair")
      .setEmoji("➡️")
      .setStyle(ButtonStyle.Danger)
  );

  const row = new ActionRowBuilder().addComponents(botoes);

  return { embeds: [embed], components: [row] };
}

function montarPainelConfigAP() {
  const embed = new EmbedBuilder()
    .setTitle("🎮 Configurar Painel de AP")
    .setDescription(
      "Configure os painéis de filas/AP usando os botões abaixo.\\n\\n" +
      `📌 **Canal:** ${db.ap.canalPainel ? `<#${db.ap.canalPainel}>` : "`Não configurado`"}\\n` +
      `📝 **Mensagem:** ${db.ap.mensagem || "`Não configurada`"}\\n` +
      `👥 **Equipe:** ${db.ap.equipe || "`1v1`"}\\n` +
      `📱 **Dispositivo:** ${db.ap.dispositivo || "`Mobile`"}\\n` +
      `💰 **Valor mínimo:** ${formatarValorBR(db.ap.valorMin || 0.30)}\\n` +
      `💰 **Valor máximo:** ${formatarValorBR(db.ap.valorMax || 1.00)}\\n` +
      `🖼️ **Imagem:** ${db.ap.imagem || "`Não configurada`"}`
    )
    .setColor("#00d4d8")
    .setFooter({ text: "Depois de configurar, clique em Enviar Painéis." });

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ap_config_mensagem")
      .setLabel("Editar mensagem")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ap_config_equipe")
      .setLabel("Editar equipe")
      .setEmoji("👥")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ap_config_dispositivo")
      .setLabel("Dispositivo")
      .setEmoji("📱")
      .setStyle(ButtonStyle.Success)
  );

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("ap_config_valores")
      .setLabel("Valores")
      .setEmoji("💰")
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId("ap_config_canal")
      .setLabel("Editar canal")
      .setEmoji("📌")
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId("ap_enviar_paineis")
      .setLabel("Enviar painéis")
      .setEmoji("📨")
      .setStyle(ButtonStyle.Danger)
  );

  return { embeds: [embed], components: [row1, row2] };
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
    .setDescription('Configurar e enviar painéis de AP/filas'),

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
// Isso mantém os comandos no servidor configurado e também registra comandos globais.
// Os comandos globais ajudam o Discord a reconhecer o bot como "Compatível com comandos".
const rest = new REST({ version: '10' }).setToken(config.token);

(async () => {
  try {
    if (!config.token || !config.clientId || !config.guildId) {
      console.log('Configure TOKEN, CLIENT_ID e GUILD_ID nas variáveis de ambiente.');
      return;
    }

    console.log('Registrando comandos slash no servidor...');

    // Comandos do servidor: aparecem mais rápido no servidor configurado.
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      { body: commands }
    );

    console.log('Comandos do servidor registrados com sucesso!');

    console.log('Registrando comandos slash globais...');

    // Comandos globais: ajudam o app/bot a exibir a insígnia "Compatível com comandos".
    // Pode levar alguns minutos para aparecer em todos os servidores.
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );

    console.log('Comandos globais registrados com sucesso!');
    console.log('Para a insígnia aparecer, convide o bot com os escopos: bot e applications.commands.');
    console.log(`Link de convite sugerido: https://discord.com/oauth2/authorize?client_id=${config.clientId}&permissions=8&scope=bot%20applications.commands`);
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
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores podem configurar os painéis.',
            ephemeral: true
          });
        }

        return interaction.reply({
          ...montarPainelConfigAP(),
          ephemeral: true
        });
      }

      // /TICKET
      if (interaction.commandName === 'ticket') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores podem configurar o painel de tickets.',
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle('🎫 Configurar Painel de Tickets')
          .setDescription(
            'Personalize o painel de tickets usando os botões abaixo.\n\n' +
            `📌 **Canal do painel:** ${db.ticket.canalPainel ? `<#${db.ticket.canalPainel}>` : '`Não configurado`'}\n` +
            `📝 **Título:** ${db.ticket.titulo || '`Não configurado`'}\n` +
            `💬 **Mensagem:** ${db.ticket.mensagem || '`Não configurada`'}\n` +
            `🖼️ **Imagem:** ${db.ticket.imagem ? db.ticket.imagem : '`Não configurada`'}\n` +
            `🔘 **Botão:** ${db.ticket.botaoLabel || '`Não configurado`'}\n` +
            `🎨 **Cor do botão:** ${db.ticket.botaoCor || '`Danger`'}`
          )
          .setColor('#ff9900')
          .setFooter({ text: 'Depois de configurar, clique em Enviar Painel.' });

        const row1 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_config_canal')
            .setLabel('📌 Canal')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId('ticket_config_texto')
            .setLabel('📝 Texto e imagem')
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId('ticket_config_botao')
            .setLabel('🔘 Botão')
            .setStyle(ButtonStyle.Success)
        );

        const row2 = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId('ticket_preview')
            .setLabel('👀 Prévia')
            .setStyle(ButtonStyle.Secondary),

          new ButtonBuilder()
            .setCustomId('ticket_enviar_painel')
            .setLabel('📨 Enviar Painel')
            .setStyle(ButtonStyle.Danger)
        );

        return interaction.reply({
          embeds: [embed],
          components: [row1, row2],
          ephemeral: true
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

      // PAINEL AP - EDITAR MENSAGEM
      if (interaction.customId === 'ap_config_mensagem') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ap_mensagem')
          .setTitle('Editar mensagem do AP');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mensagem')
              .setLabel('Mensagem enviada junto dos painéis')
              .setPlaceholder('Exemplo: FILAS ON')
              .setValue(db.ap.mensagem || 'FILAS ON')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('imagem')
              .setLabel('URL da imagem/thumbnail')
              .setPlaceholder('Opcional')
              .setValue(db.ap.imagem || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        return interaction.showModal(modal);
      }

      // PAINEL AP - EDITAR EQUIPE
      if (interaction.customId === 'ap_config_equipe') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ap_equipe')
          .setTitle('Editar equipe');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('equipe')
              .setLabel('Equipe: 1v1, 2v2, 3v3 ou 4v4')
              .setPlaceholder('Exemplo: 1v1')
              .setValue(db.ap.equipe || '1v1')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // PAINEL AP - DISPOSITIVO
      if (interaction.customId === 'ap_config_dispositivo') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ap_dispositivo')
          .setTitle('Editar dispositivo');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('dispositivo')
              .setLabel('Dispositivo: PC, Mobile ou Misto')
              .setPlaceholder('Mobile')
              .setValue(db.ap.dispositivo || 'Mobile')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // PAINEL AP - VALORES
      if (interaction.customId === 'ap_config_valores') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ap_valores')
          .setTitle('Editar valores');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('minimo')
              .setLabel('Valor mínimo')
              .setPlaceholder('Exemplo: 0,30')
              .setValue(String(db.ap.valorMin || 0.30).replace('.', ','))
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('maximo')
              .setLabel('Valor máximo')
              .setPlaceholder('Exemplo: 100')
              .setValue(String(db.ap.valorMax || 1).replace('.', ','))
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // PAINEL AP - CANAL
      if (interaction.customId === 'ap_config_canal') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ap_canal')
          .setTitle('Editar canal dos painéis');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('canal')
              .setLabel('ID do canal onde serão enviados')
              .setPlaceholder('Exemplo: 123456789012345678')
              .setValue(db.ap.canalPainel || '')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // PAINEL AP - ENVIAR PAINÉIS
      if (interaction.customId === 'ap_enviar_paineis') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({ content: '❌ Apenas administradores.', ephemeral: true });
        }

        if (!db.ap.canalPainel) {
          return interaction.reply({
            content: '❌ Configure primeiro o canal onde os painéis serão enviados.',
            ephemeral: true
          });
        }

        const canal = interaction.guild.channels.cache.get(db.ap.canalPainel);

        if (!canal || canal.type !== ChannelType.GuildText) {
          return interaction.reply({
            content: '❌ Canal inválido ou não encontrado.',
            ephemeral: true
          });
        }

        const valores = gerarValoresPainel(db.ap.valorMin, db.ap.valorMax);

        if (valores.length === 0) {
          return interaction.reply({
            content: '❌ Valores inválidos. Configure um valor mínimo e máximo corretos.',
            ephemeral: true
          });
        }

        await canal.send(db.ap.mensagem || 'FILAS ON');

        for (const valor of valores) {
          const filaId = montarIdFila(db.ap.equipe, db.ap.dispositivo, valor);

          db.filas[filaId] = {
            equipe: normalizarEquipe(db.ap.equipe),
            dispositivo: normalizarDispositivo(db.ap.dispositivo),
            valor,
            jogadores: {}
          };

          const msg = await canal.send(
            montarPainelAP({
              equipe: db.ap.equipe,
              dispositivo: db.ap.dispositivo,
              valor,
              filaId
            })
          );

          db.filas[filaId].channelId = canal.id;
          db.filas[filaId].messageId = msg.id;
        }

        salvarDB();

        return interaction.reply({
          content: `✅ ${valores.length} painel(is) de AP enviados em ${canal}.`,
          ephemeral: true
        });
      }

      // PAINEL AP - ENTRAR EM UMA OPÇÃO
      if (interaction.customId.startsWith('ap_join_')) {
        const parts = interaction.customId.split('_');
        const botao = parts.pop().replace(/_/g, ' ');
        const filaId = parts.slice(2).join('_');

        const fila = obterFila(filaId);
        fila.jogadores[interaction.user.id] = botao;
        salvarDB();

        await interaction.update(
          montarPainelAP({
            equipe: fila.equipe || db.ap.equipe,
            dispositivo: fila.dispositivo || db.ap.dispositivo,
            valor: fila.valor || db.ap.valorMin,
            filaId
          })
        );

        return;
      }

      // PAINEL AP - SAIR DA FILA
      if (interaction.customId.startsWith('ap_sair_')) {
        const filaId = interaction.customId.replace('ap_sair_', '');
        const fila = obterFila(filaId);

        delete fila.jogadores[interaction.user.id];
        salvarDB();

        await interaction.update(
          montarPainelAP({
            equipe: fila.equipe || db.ap.equipe,
            dispositivo: fila.dispositivo || db.ap.dispositivo,
            valor: fila.valor || db.ap.valorMin,
            filaId
          })
        );

        return;
      }

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

      // CONFIG TICKET - CANAL
      if (interaction.customId === 'ticket_config_canal') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ticket_canal')
          .setTitle('Canal do Painel de Tickets');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('canal')
              .setLabel('ID do canal onde o painel será enviado')
              .setPlaceholder('Exemplo: 123456789012345678')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG TICKET - TEXTO E IMAGEM
      if (interaction.customId === 'ticket_config_texto') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ticket_texto')
          .setTitle('Texto do Painel de Tickets');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('titulo')
              .setLabel('Título do painel')
              .setPlaceholder('Exemplo: 🎫 Atendimento')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('mensagem')
              .setLabel('Mensagem do painel')
              .setPlaceholder('Explique aqui como o usuário deve abrir ticket.')
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('imagem')
              .setLabel('URL da imagem, banner ou GIF')
              .setPlaceholder('https://exemplo.com/imagem.png')
              .setStyle(TextInputStyle.Short)
              .setRequired(false)
          )
        );

        return interaction.showModal(modal);
      }

      // CONFIG TICKET - BOTÃO
      if (interaction.customId === 'ticket_config_botao') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        const modal = new ModalBuilder()
          .setCustomId('modal_ticket_botao')
          .setTitle('Botão do Painel');

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('label')
              .setLabel('Nome do botão')
              .setPlaceholder('Exemplo: Abrir Ticket')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('cor')
              .setLabel('Cor: Primary, Secondary, Success ou Danger')
              .setPlaceholder('Danger')
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // PRÉVIA DO PAINEL DE TICKETS
      if (interaction.customId === 'ticket_preview') {
        return interaction.reply({
          ...montarPainelTicket(),
          ephemeral: true
        });
      }

      // ENVIAR PAINEL DE TICKETS
      if (interaction.customId === 'ticket_enviar_painel') {
        if (!somenteAdmin(interaction)) {
          return interaction.reply({
            content: '❌ Apenas administradores.',
            ephemeral: true
          });
        }

        if (!db.ticket.canalPainel) {
          return interaction.reply({
            content: '❌ Configure primeiro o canal onde o painel será enviado.',
            ephemeral: true
          });
        }

        const canal = interaction.guild.channels.cache.get(db.ticket.canalPainel);

        if (!canal) {
          return interaction.reply({
            content: '❌ Canal não encontrado. Verifique o ID configurado.',
            ephemeral: true
          });
        }

        await canal.send(montarPainelTicket());

        return interaction.reply({
          content: `✅ Painel de tickets enviado em ${canal}!`,
          ephemeral: true
        });
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

      // SALVAR MENSAGEM DO PAINEL AP
      if (interaction.customId === 'modal_ap_mensagem') {
        db.ap.mensagem = interaction.fields.getTextInputValue('mensagem');
        db.ap.imagem = interaction.fields.getTextInputValue('imagem') || '';
        salvarDB();

        return interaction.reply({
          content: '✅ Mensagem e imagem do painel AP salvas com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR EQUIPE DO PAINEL AP
      if (interaction.customId === 'modal_ap_equipe') {
        const equipe = normalizarEquipe(interaction.fields.getTextInputValue('equipe'));
        db.ap.equipe = equipe;
        salvarDB();

        return interaction.reply({
          content: `✅ Equipe configurada para **${equipe}**.`,
          ephemeral: true
        });
      }

      // SALVAR DISPOSITIVO DO PAINEL AP
      if (interaction.customId === 'modal_ap_dispositivo') {
        const dispositivo = normalizarDispositivo(interaction.fields.getTextInputValue('dispositivo'));
        db.ap.dispositivo = dispositivo;
        salvarDB();

        return interaction.reply({
          content: `✅ Dispositivo configurado para **${dispositivo}**.`,
          ephemeral: true
        });
      }

      // SALVAR VALORES DO PAINEL AP
      if (interaction.customId === 'modal_ap_valores') {
        const minimo = Number(interaction.fields.getTextInputValue('minimo').replace(',', '.'));
        const maximo = Number(interaction.fields.getTextInputValue('maximo').replace(',', '.'));

        if (Number.isNaN(minimo) || Number.isNaN(maximo) || minimo <= 0 || maximo < minimo) {
          return interaction.reply({
            content: '❌ Valores inválidos. Exemplo correto: mínimo `0,30` e máximo `100`.',
            ephemeral: true
          });
        }

        db.ap.valorMin = Number(minimo.toFixed(2));
        db.ap.valorMax = Number(maximo.toFixed(2));
        salvarDB();

        return interaction.reply({
          content: `✅ Valores configurados de ${formatarValorBR(db.ap.valorMin)} até ${formatarValorBR(db.ap.valorMax)}.`,
          ephemeral: true
        });
      }

      // SALVAR CANAL DO PAINEL AP
      if (interaction.customId === 'modal_ap_canal') {
        const canalId = interaction.fields.getTextInputValue('canal').trim();
        const canal = interaction.guild.channels.cache.get(canalId);

        if (!canal || canal.type !== ChannelType.GuildText) {
          return interaction.reply({
            content: '❌ Canal inválido. Use o ID de um canal de texto.',
            ephemeral: true
          });
        }

        db.ap.canalPainel = canalId;
        salvarDB();

        return interaction.reply({
          content: `✅ Canal dos painéis AP configurado para ${canal}.`,
          ephemeral: true
        });
      }

      // SALVAR CANAL DO PAINEL DE TICKETS
      if (interaction.customId === 'modal_ticket_canal') {
        db.ticket.canalPainel = interaction.fields.getTextInputValue('canal');
        salvarDB();

        return interaction.reply({
          content: '✅ Canal do painel de tickets salvo com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR TEXTO E IMAGEM DO PAINEL DE TICKETS
      if (interaction.customId === 'modal_ticket_texto') {
        db.ticket.titulo = interaction.fields.getTextInputValue('titulo');
        db.ticket.mensagem = interaction.fields.getTextInputValue('mensagem');
        db.ticket.imagem = interaction.fields.getTextInputValue('imagem') || '';
        salvarDB();

        return interaction.reply({
          content: '✅ Texto e imagem do painel de tickets salvos com sucesso!',
          ephemeral: true
        });
      }

      // SALVAR BOTÃO DO PAINEL DE TICKETS
      if (interaction.customId === 'modal_ticket_botao') {
        const cor = interaction.fields.getTextInputValue('cor');
        const coresPermitidas = ['Primary', 'Secondary', 'Success', 'Danger'];

        db.ticket.botaoLabel = interaction.fields.getTextInputValue('label');
        db.ticket.botaoCor = coresPermitidas.includes(cor) ? cor : 'Danger';
        salvarDB();

        return interaction.reply({
          content: '✅ Botão do painel de tickets salvo com sucesso!',
          ephemeral: true
        });
      }

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
