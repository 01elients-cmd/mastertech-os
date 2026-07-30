import fs from 'fs';
import path from 'path';

// Cargar variables de .env.local
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

async function runIntakeValidationTest() {
  const token = process.env.TELEGRAM_BOT_TOKEN || '8970513614:AAGCdMrJTbIH1QmKCFXcIzv5QxPX86e_23U';
  const notificationGroup = '-1003940815012'; // MT Operatio. Mmm Group

  console.log('--- TEST CASO 2: MENSAJE INCOMPLETO (SIN ORDEN) ---');
  const incompleteText = `🚗 NUEVO INGRESO
• Vehículo: Toyota Hilux 2022, Blanco
• Cliente: Roberto Fernández
• Falla Reportada: Sonido metálico en frenos`;

  try {
    // Probar envío de menú interactivo de alerta al grupo
    const resAlert = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: notificationGroup,
        text: `⚠️ *DATOS INCOMPLETOS EN EL INGRESO*\n\n🚘 *Vehículo detectado:* \`Toyota Hilux 2022, Blanco\`\n❌ *Falta:* Número de Orden / OT.\n\nPor favor selecciona una opción para continuar con el registro:`,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '✍️ Ingresar Orden Manual', callback_data: 'INTAKE_MANUAL:p_demo_1' }],
            [{ text: '⚡ Crear sin Orden (Temporal)', callback_data: 'INTAKE_TEMP:p_demo_1' }],
            [{ text: '❌ Cancelar Registro', callback_data: 'INTAKE_CANCEL:p_demo_1' }]
          ]
        }
      })
    });
    const dataAlert = await resAlert.json();
    console.log('Resultado Menú Interactivo de Alerta:', JSON.stringify(dataAlert, null, 2));

  } catch (err) {
    console.error('Error probando validación de ingreso:', err);
  }
}

runIntakeValidationTest().catch(console.error);
