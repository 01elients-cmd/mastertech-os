import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const envPath = path.join(process.cwd(), '.env.local');

// Memoria de configuración en tiempo de ejecución para Vercel
const inMemoryRuntimeConfig: Record<string, string> = {};

function parseEnv() {
  const env: Record<string, string> = { ...inMemoryRuntimeConfig };
  try {
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
        env[key] = val;
      });
    }
  } catch (e) {
    console.warn('Advertencia leyendo .env.local:', e);
  }
  return env;
}

function writeEnv(env: Record<string, string>) {
  try {
    const lines = Object.entries(env)
      .map(([key, val]) => `${key}="${val.replace(/"/g, '\\"')}"`)
      .join('\n');
    fs.writeFileSync(envPath, lines, 'utf8');
  } catch (err) {
    console.warn('FileSystem en Vercel es de solo lectura. Se mantendrán las variables en memoria runtime:', err);
  }
}

export async function GET() {
  try {
    const currentEnv = parseEnv();
    
    const hasSupabase = !!(process.env.NEXT_PUBLIC_SUPABASE_URL || currentEnv.NEXT_PUBLIC_SUPABASE_URL);
    const hasBotToken = !!(process.env.TELEGRAM_BOT_TOKEN || currentEnv.TELEGRAM_BOT_TOKEN);
    
    let supabaseStatus = 'DISCONNECTED';
    let errorMessage = '';

    if (hasSupabase) {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL || currentEnv.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || currentEnv.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      try {
        const client = createClient(url!, key!);
        const { error } = await client.from('jornadas').select('*').limit(1);
        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('not found') || error.message.includes('select')) {
            supabaseStatus = 'CONNECTED_NO_TABLES';
            errorMessage = 'Conectado a Supabase pero requiere crear las tablas del dashboard.';
          } else {
            supabaseStatus = 'ERROR';
            errorMessage = error.message;
          }
        } else {
          supabaseStatus = 'CONNECTED';
        }
      } catch (err: any) {
        supabaseStatus = 'ERROR';
        errorMessage = err.message || 'Error de conexión desconocido';
      }
    }

    const maskKey = (val: string | undefined) => {
      if (!val) return '';
      if (val.length < 10) return val;
      return `${val.substring(0, 6)}••••${val.substring(val.length - 4)}`;
    };

    return NextResponse.json({
      config: {
        NEXT_PUBLIC_SUPABASE_URL: currentEnv.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ? currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? maskKey(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) : ''),
        SUPABASE_SERVICE_ROLE_KEY: currentEnv.SUPABASE_SERVICE_ROLE_KEY ? currentEnv.SUPABASE_SERVICE_ROLE_KEY : (process.env.SUPABASE_SERVICE_ROLE_KEY ? maskKey(process.env.SUPABASE_SERVICE_ROLE_KEY) : ''),
        TELEGRAM_BOT_TOKEN: currentEnv.TELEGRAM_BOT_TOKEN ? currentEnv.TELEGRAM_BOT_TOKEN : (process.env.TELEGRAM_BOT_TOKEN ? maskKey(process.env.TELEGRAM_BOT_TOKEN) : ''),
        REQUIRE_MEDIA_CAPTION: currentEnv.REQUIRE_MEDIA_CAPTION || process.env.REQUIRE_MEDIA_CAPTION || 'false',
        TALLER_ORIGEN_ID: currentEnv.TALLER_ORIGEN_ID || process.env.TALLER_ORIGEN_ID || '',
        TALLER_FORO_DESTINO_ID: currentEnv.TALLER_FORO_DESTINO_ID || process.env.TALLER_FORO_DESTINO_ID || '',
        GEMINI_API_KEY: currentEnv.GEMINI_API_KEY ? currentEnv.GEMINI_API_KEY : (process.env.GEMINI_API_KEY ? maskKey(process.env.GEMINI_API_KEY) : ''),
      },
      status: {
        supabase: supabaseStatus,
        errorMessage,
        telegramActive: hasBotToken,
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const currentEnv = parseEnv();

    const isMasked = (val: string) => val.includes('••••');

    // Update variables
    if ('NEXT_PUBLIC_SUPABASE_URL' in body) {
      currentEnv.NEXT_PUBLIC_SUPABASE_URL = body.NEXT_PUBLIC_SUPABASE_URL;
      inMemoryRuntimeConfig.NEXT_PUBLIC_SUPABASE_URL = body.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_URL = body.NEXT_PUBLIC_SUPABASE_URL;
    }
    if ('NEXT_PUBLIC_SUPABASE_ANON_KEY' in body && !isMasked(body.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
      currentEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      inMemoryRuntimeConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = body.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
    if ('SUPABASE_SERVICE_ROLE_KEY' in body && !isMasked(body.SUPABASE_SERVICE_ROLE_KEY)) {
      currentEnv.SUPABASE_SERVICE_ROLE_KEY = body.SUPABASE_SERVICE_ROLE_KEY;
      inMemoryRuntimeConfig.SUPABASE_SERVICE_ROLE_KEY = body.SUPABASE_SERVICE_ROLE_KEY;
      process.env.SUPABASE_SERVICE_ROLE_KEY = body.SUPABASE_SERVICE_ROLE_KEY;
    }
    if ('TELEGRAM_BOT_TOKEN' in body && !isMasked(body.TELEGRAM_BOT_TOKEN)) {
      currentEnv.TELEGRAM_BOT_TOKEN = body.TELEGRAM_BOT_TOKEN;
      inMemoryRuntimeConfig.TELEGRAM_BOT_TOKEN = body.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = body.TELEGRAM_BOT_TOKEN;
    }
    if ('GEMINI_API_KEY' in body && !isMasked(body.GEMINI_API_KEY)) {
      currentEnv.GEMINI_API_KEY = body.GEMINI_API_KEY;
      inMemoryRuntimeConfig.GEMINI_API_KEY = body.GEMINI_API_KEY;
      process.env.GEMINI_API_KEY = body.GEMINI_API_KEY;
    }
    if ('REQUIRE_MEDIA_CAPTION' in body) {
      const valStr = String(body.REQUIRE_MEDIA_CAPTION);
      currentEnv.REQUIRE_MEDIA_CAPTION = valStr;
      inMemoryRuntimeConfig.REQUIRE_MEDIA_CAPTION = valStr;
      process.env.REQUIRE_MEDIA_CAPTION = valStr;
    }
    if ('TALLER_ORIGEN_ID' in body) {
      currentEnv.TALLER_ORIGEN_ID = body.TALLER_ORIGEN_ID;
      inMemoryRuntimeConfig.TALLER_ORIGEN_ID = body.TALLER_ORIGEN_ID;
      process.env.TALLER_ORIGEN_ID = body.TALLER_ORIGEN_ID;
    }
    if ('TALLER_FORO_DESTINO_ID' in body) {
      currentEnv.TALLER_FORO_DESTINO_ID = body.TALLER_FORO_DESTINO_ID;
      inMemoryRuntimeConfig.TALLER_FORO_DESTINO_ID = body.TALLER_FORO_DESTINO_ID;
      process.env.TALLER_FORO_DESTINO_ID = body.TALLER_FORO_DESTINO_ID;
    }

    writeEnv(currentEnv);

    return NextResponse.json({ success: true, message: 'Configuración guardada correctamente.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
