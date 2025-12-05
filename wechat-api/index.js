import { WechatyBuilder } from 'wechaty';
import qrcodeTerminal from 'qrcode-terminal';
import express from 'express';

// --- CONFIGURAÇÕES ---
const PORT = process.env.PORT || 3000;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL; // URL do seu n8n para receber mensagens

// --- SERVIDOR EXPRESS (API) ---
const app = express();
app.use(express.json());

// --- ROBÔ WECHAT ---
// O segredo está aqui: 'wechaty-puppet-wechat4u' simula o Desktop Linux
const bot = WechatyBuilder.build({
  name: 'wechat-bridge',
  puppet: 'wechaty-puppet-wechat4u',
});

// 1. Gera QR Code no Log para você escanear
bot.on('scan', (qrcode, status) => {
  console.log(`\nStatus do Scan: ${status}\n`);
  // Gera o QR Code pequeno no terminal para facilitar a leitura nos logs do EasyPanel
  qrcodeTerminal.generate(qrcode, { small: true }); 
  console.log(`\nLink direto (caso o QR falhe): https://wechaty.js.org/qrcode/${encodeURIComponent(qrcode)}\n`);
});

bot.on('login', user => console.log(`✅ USUÁRIO LOGADO: ${user}`));

bot.on('logout', user => console.log(`❌ USUÁRIO DESLOGADO: ${user}`));

// 2. Quando receber mensagem no WeChat -> Manda para o n8n
bot.on('message', async message => {
  try {
    // Ignora mensagens enviadas por você mesmo ou mensagens de sistema
    if (message.self() || message.type() !== bot.Message.Type.Text) return;

    const contact = message.talker();
    const text = message.text();
    const room = message.room(); // Se for grupo

    console.log(`📩 Mensagem recebida de ${contact.name()}: ${text}`);

    if (N8N_WEBHOOK_URL) {
      await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact_name: contact.name(),
          contact_id: contact.id, // IMPORTANTE: Use este ID para responder
          text: text,
          is_room: !!room
        })
      });
    }
  } catch (e) {
    console.error('Erro ao processar mensagem:', e);
  }
});

// --- ROTAS DA API (Para o n8n usar) ---

// Rota para Enviar Mensagem
app.post('/send', async (req, res) => {
  const { contact_id, message } = req.body;

  if (!contact_id || !message) {
    return res.status(400).json({ error: 'Faltando contact_id ou message' });
  }

  try {
    // Busca o contato pelo ID
    const contact = await bot.Contact.find({ id: contact_id });
    
    if (!contact) {
      return res.status(404).json({ error: 'Contato não encontrado. O bot precisa ter o contato adicionado.' });
    }

    await contact.say(message);
    console.log(`📤 Mensagem enviada para ${contact.name()}`);
    return res.json({ success: true });

  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// Rota para checar status
app.get('/status', (req, res) => {
  res.json({ logged_in: bot.isLoggedIn });
});

// Inicia o Bot e o Servidor
bot.start()
  .then(() => {
    console.log('🤖 Bot Iniciado! Verifique os logs para o QR Code.');
    app.listen(PORT, () => console.log(`🚀 API rodando na porta ${PORT}`));
  })
  .catch(console.error);