import fs from 'fs';
import path from 'path';

// Cargar variables de .env.local ANTES de importar lib/bot
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  content.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const index = trimmed.indexOf('=');
    if (index === -1) return;
    const key = trimmed.substring(0, index).trim();
    let val = trimmed.substring(index + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.substring(1, val.length - 1);
    }
    process.env[key] = val;
  });
}

async function main() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  console.log('Iniciando listener local para bot token:', token ? `${token.substring(0, 10)}...` : 'NO TOKEN');
  
  if (!token) {
    console.error('ERROR: No se encontró TELEGRAM_BOT_TOKEN en .env.local');
    return;
  }

  // Importar dinámicamente lib/bot una vez que las variables de entorno ya están cargadas en process.env
  const { bot } = await import('./lib/bot');

  // Limpiar webhook para permitir polling local en desarrollo
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=true`);
    console.log('Webhook eliminado temporalmente para permitir polling en tiempo real.');
  } catch (e) {
    console.error('Error al limpiar webhook:', e);
  }

  bot.launch(() => {
    console.log('🤖 Bot de MasterTech OS escuchando mensajes localmente en tiempo real...');
  });

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
}

main().catch(console.error);
