import { NextResponse } from 'next/server';
import { getSupabaseClient } from '@/lib/dashboard-db';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const fallbackPath = path.join(process.cwd(), 'lib', 'database_fallback.json');

// Helper to read database_fallback.json
function readFallback() {
  try {
    if (!fs.existsSync(fallbackPath)) {
      return {};
    }
    const raw = fs.readFileSync(fallbackPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading fallback json:', err);
    return {};
  }
}

// Helper to write to database_fallback.json
function writeFallback(data: any) {
  try {
    const parentDir = path.dirname(fallbackPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(fallbackPath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Error writing fallback json:', err);
  }
}

// Get mock data for a table
function getMockData(table: string): any[] {
  const now = new Date();
  switch (table) {
    case 'work_orders':
      return [
        {
          id: 'wo-1',
          order_number: 5201,
          plate: 'AA890BB',
          brand: 'Toyota',
          model: 'Corolla',
          year: 2018,
          client_name: 'Alejandro Mendoza',
          reported_issue: 'Ruido metálico al cruzar a la derecha y vibración en el volante',
          confirmed_diagnosis: 'Amortiguadores desgastados y mangueta agrietada',
          assigned_technician: 'José Gómez',
          ramp_number: 2,
          status: 'ESPERANDO_APROBACION',
          priority: 'ALTA',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'wo-2',
          order_number: 5202,
          plate: 'XY882CC',
          brand: 'Ford',
          model: 'F-150',
          year: 2020,
          client_name: 'Juan Pérez',
          reported_issue: 'Servicio de mantenimiento 40k km y cambio de bujías',
          confirmed_diagnosis: 'Reemplazo bujías y cambio aceite 5W-20',
          assigned_technician: 'Carlos Pérez',
          ramp_number: 1,
          status: 'EN_REPARACION',
          priority: 'NORMAL',
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: now.toISOString()
        },
        {
          id: 'wo-3',
          order_number: 5203,
          plate: 'LK991EE',
          brand: 'Chevrolet',
          model: 'Tahoe',
          year: 2019,
          client_name: 'Pedro Gómez',
          reported_issue: 'Aire acondicionado no enfría',
          confirmed_diagnosis: 'Fuga detectada en condensador AC',
          assigned_technician: 'Marcos Altuve',
          ramp_number: 3,
          status: 'ESPERANDO_REPUESTOS',
          priority: 'ALTA',
          created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    case 'inventory':
      return [
        {
          id: 'inv-1',
          sku: 'OIL-5W30-TAC',
          name: 'Aceite Motor 5W-30 Tacoma (Galón)',
          category: 'FLUIDO',
          unit: 'galon',
          quantity: 15.5,
          min_stock: 5,
          cost_per_unit: 25.50,
          sale_price: 38.00,
          location: 'A-12',
          supplier: 'AutoParts Express'
        },
        {
          id: 'inv-2',
          sku: 'FIL-123-COR',
          name: 'Filtro Aceite Corolla',
          category: 'REPUESTO',
          unit: 'unidad',
          quantity: 8,
          min_stock: 3,
          cost_per_unit: 4.50,
          sale_price: 9.50,
          location: 'B-04',
          supplier: 'Toyota Genuine Parts'
        },
        {
          id: 'inv-3',
          sku: 'BRAKE-PA-CIV',
          name: 'Pastillas de Freno Delanteras Honda Civic',
          category: 'REPUESTO',
          unit: 'juego',
          quantity: 1,
          min_stock: 2,
          cost_per_unit: 35.00,
          sale_price: 55.00,
          location: 'C-15',
          supplier: 'Brembo Latam'
        }
      ];
    case 'logistics':
      return [
        {
          id: 'log-1',
          part_name: 'Condensador Aire Acondicionado Tahoe',
          plate: 'LK991EE',
          supplier: 'Chevrolet OEM',
          tracking_number: 'DHL882910283',
          status: 'EN_TRANSITO',
          eta_date: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Frenado temporalmente en aduana de puerto local.'
        },
        {
          id: 'log-2',
          part_name: 'Bujías Iridium F-150',
          plate: 'XY882CC',
          supplier: 'AutoParts Express',
          tracking_number: 'FEDEX99827102',
          status: 'RECIBIDO',
          eta_date: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          notes: 'Entregado en almacén de taller.'
        }
      ];
    case 'alerts':
      return [
        {
          id: 'alt-1',
          type: 'PREVENTIVA',
          severity: 'CRITICA',
          title: '🚨 Fuga Detectada - Tahoe',
          message: 'Reportado por Marcos Altuve: "Fuga de aceite en manguera de presión del condensador de AC."',
          keywords_detected: ['fuga', 'aceite'],
          is_resolved: false,
          created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 'alt-2',
          type: 'INVENTARIO_BAJO',
          severity: 'ALTA',
          title: '⚠️ Stock bajo: Pastillas Freno Civic',
          message: 'El producto "Pastillas de Freno Honda Civic" tiene 1 juego(s) restante(s). Mínimo: 2 juegos.',
          keywords_detected: [],
          is_resolved: false,
          created_at: new Date(now.getTime() - 12 * 60 * 60 * 1000).toISOString()
        }
      ];
    case 'approvals':
      return [
        {
          id: 'appr-1',
          plate: 'AA890BB',
          description: 'Cambio de mangueta derecha y juego de amortiguadores delanteros adicionales',
          estimated_cost: 145.00,
          requested_by: 'José Gómez',
          status: 'PENDIENTE',
          created_at: new Date(now.getTime() - 18 * 60 * 60 * 1000).toISOString()
        }
      ];
    case 'media_registry':
      return [
        {
          id: 'med-1',
          plate: 'AA890BB',
          file_type: 'photo',
          caption: 'Evidencia de mangueta agrietada',
          category: 'diagnostico',
          uploaded_by: 'José Gómez',
          created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
        }
      ];
    default:
      return [];
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const table = url.searchParams.get('table');
    if (!table) {
      return NextResponse.json({ error: 'Falta parámetro table' }, { status: 400 });
    }

    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from(table)
          .select('*')
          .order('created_at', { ascending: false, foreignTable: '', nullsFirst: false });
        
        if (!error && data) {
          return NextResponse.json({ data });
        }
        if (error) {
          console.warn(`Error querying ${table} in Supabase:`, error.message);
        }
      } catch (e) {
        console.warn(`Exception querying ${table} in Supabase:`, e);
      }
    }

    // Fallback to local database_fallback.json
    const fallback = readFallback();
    if (!fallback[table]) {
      fallback[table] = getMockData(table);
      writeFallback(fallback);
    }
    
    return NextResponse.json({ data: fallback[table] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, table, data } = body;

    const client = getSupabaseClient();

    if (action === 'update_approval_status') {
      const { id, status, approved_by } = data;
      
      if (client) {
        try {
          const { data: updated, error } = await client
            .from('approvals')
            .update({
              status,
              approved_by,
              responded_at: new Date().toISOString()
            })
            .eq('id', id)
            .select()
            .single();

          if (!error && updated) {
            // If approved, update work order status
            if (status === 'APROBADO' && updated.work_order_id) {
              await client
                .from('work_orders')
                .update({ status: 'APROBADO' })
                .eq('id', updated.work_order_id);
            }
            return NextResponse.json({ success: true, record: updated });
          }
          if (error) throw new Error(error.message);
        } catch (e: any) {
          console.warn('Supabase approval update exception:', e);
        }
      }

      // Local fallback
      const fallback = readFallback();
      if (!fallback.approvals) fallback.approvals = getMockData('approvals');
      const idx = fallback.approvals.findIndex((a: any) => a.id === id);
      if (idx !== -1) {
        fallback.approvals[idx].status = status;
        fallback.approvals[idx].approved_by = approved_by;
        fallback.approvals[idx].responded_at = new Date().toISOString();
        
        // Also update work_orders locally if available
        if (status === 'APROBADO' && fallback.work_orders) {
          const woIdx = fallback.work_orders.findIndex((w: any) => w.plate === fallback.approvals[idx].plate);
          if (woIdx !== -1) {
            fallback.work_orders[woIdx].status = 'APROBADO';
          }
        }
        
        writeFallback(fallback);
        return NextResponse.json({ success: true, record: fallback.approvals[idx] });
      }
      return NextResponse.json({ error: 'Aprobación no encontrada' }, { status: 444 });
    }

    if (action === 'create_item' && table) {
      if (client) {
        try {
          const { data: inserted, error } = await client
            .from(table)
            .insert([data])
            .select()
            .single();

          if (!error && inserted) {
            return NextResponse.json({ success: true, record: inserted });
          }
          if (error) throw new Error(error.message);
        } catch (e: any) {
          console.warn(`Supabase insert item in ${table} exception:`, e);
        }
      }

      // Local fallback
      const fallback = readFallback();
      if (!fallback[table]) fallback[table] = getMockData(table);
      const newRecord = { id: `local-${Date.now()}`, ...data, created_at: new Date().toISOString() };
      fallback[table].unshift(newRecord);
      writeFallback(fallback);
      return NextResponse.json({ success: true, record: newRecord });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
