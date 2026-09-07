const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || "clave_secreta_default";

let sock;
let qrCodeImage = null;
let isConnected = false;

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false
  });

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrCodeImage = await QRCode.toDataURL(qr);
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      isConnected = false;
      if (shouldReconnect) {
        connectToWhatsApp();
      }
    } else if (connection === 'open') {
      isConnected = true;
      qrCodeImage = null;
      console.log('WhatsApp conectado con exito');
    }
  });

  sock.ev.on('creds.update', saveCreds);
}

connectToWhatsApp();

//Ruta para escanear el QR desde cualquier navegador
app.get('/qr', (req, res) => {
  if (isConnected) {
    return res.send('<h3>WhatsApp ya esta conectado y operativo.</h3>');
  }
  if (!qrCodeImage) {
    return res.send('<h3>Generando codigo QR... actualiza la pagina en unos segundos.</h3>');
  }
  res.send(`<h2>Escanea este codigo con WhatsApp:</h2><img src="${qrCodeImage}"/><br><p>Abre WhatsApp en tu telefono > Dispositivos vinculados > Vincular un dispositivo</p>`);
});

//Endpoint que recibe las alertas enviadas desde Google Sheets
app.post('/send-alert', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${API_KEY}`) {
    return res.status(401).json({ success: false, error: 'No autorizado' });
  }

  if (!isConnected) {
    return res.status(503).json({ success: false, error: 'WhatsApp desconectado' });
  }

  const { telefono, mensaje } = req.body;
  if (!telefono || !mensaje) {
    return res.status(400).json({ success: false, error: 'Faltan campos (telefono o mensaje)' });
  }

  try {
    const cleanNumber = telefono.toString().replace(/[^0-9]/g, '');
    const jid = `${cleanNumber}@s.whatsapp.net`;

    await sock.sendMessage(jid, { text: mensaje });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor activo en el puerto ${PORT}`);
});
