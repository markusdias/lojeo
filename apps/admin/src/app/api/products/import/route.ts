import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db, products } from '@lojeo/db';
import { slugify } from '@lojeo/engine';

const MAX_ROWS = 500;
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

const RowSchema = z.object({
  name: z.string().min(2),
  slug: z.string().optional(),
  sku: z.string().optional(),
  price_cents: z.coerce.number().int().positive(),
  compare_price_cents: z.coerce.number().int().positive().optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  description: z.string().optional(),
  warranty_months: z.coerce.number().int().min(0).default(12),
});

type RowInput = z.infer<typeof RowSchema>;

function tenantId(req: Request): string {
  return (
    req.headers.get('x-tenant-id') ??
    process.env.TENANT_ID ??
    '00000000-0000-0000-0000-000000000001'
  );
}

// Minimal CSV parser: handles double-quoted fields with embedded commas/newlines
function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field.trim());
        field = '';
      } else if (ch === '\n' || (ch === '\r' && next === '\n')) {
        if (ch === '\r') i++;
        row.push(field.trim());
        rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
  }
  if (field || row.length) {
    row.push(field.trim());
    rows.push(row);
  }
  return rows;
}

export interface ImportRowResult {
  row: number;
  status: 'ok' | 'error' | 'skipped';
  name?: string;
  id?: string;
  error?: string;
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const dryRun = url.searchParams.get('dry') === 'true';
  const tid = tenantId(req);

  // Accept text/csv or multipart form with file
  const contentType = req.headers.get('content-type') ?? '';
  let csvText: string;

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file_required' }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 400 });
    }
    csvText = await file.text();
  } else {
    const buf = await req.arrayBuffer().catch(() => null);
    if (!buf) return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
    if (buf.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 400 });
    }
    csvText = new TextDecoder().decode(buf);
  }

  const allRows = parseCSV(csvText.trim());
  if (allRows.length < 2) {
    return NextResponse.json({ error: 'empty_or_header_only' }, { status: 400 });
  }

  const header = allRows[0]!.map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  const dataRows = allRows.slice(1).filter((r) => r.some((c) => c !== ''));

  if (dataRows.length > MAX_ROWS) {
    return NextResponse.json({ error: 'too_many_rows', max: MAX_ROWS }, { status: 400 });
  }

  const results: ImportRowResult[] = [];
  let inserted = 0;
  let errors = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const cells = dataRows[i]!;
    const raw: Record<string, string> = {};
    header.forEach((col, idx) => {
      raw[col] = cells[idx] ?? '';
    });

    const parsed = RowSchema.safeParse({
      name: raw['name'],
      slug: raw['slug'] || undefined,
      sku: raw['sku'] || undefined,
      price_cents: raw['price_cents'],
      compare_price_cents: raw['compare_price_cents'] || undefined,
      status: raw['status'] || undefined,
      description: raw['description'] || undefined,
      warranty_months: raw['warranty_months'] || undefined,
    });

    if (!parsed.success) {
      errors++;
      results.push({
        row: i + 2,
        status: 'error',
        name: raw['name'],
        error: parsed.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
      });
      continue;
    }

    const data: RowInput = parsed.data;

    if (dryRun) {
      results.push({ row: i + 2, status: 'ok', name: data.name });
      inserted++;
      continue;
    }

    try {
      const slug = data.slug ?? slugify(data.name);
      const [row] = await db
        .insert(products)
        .values({
          tenantId: tid,
          slug,
          name: data.name,
          description: data.description,
          priceCents: data.price_cents,
          comparePriceCents: data.compare_price_cents,
          sku: data.sku,
          status: data.status,
          warrantyMonths: data.warranty_months,
        })
        .onConflictDoNothing()
        .returning({ id: products.id });

      if (!row) {
        results.push({ row: i + 2, status: 'skipped', name: data.name, error: 'slug conflict' });
      } else {
        results.push({ row: i + 2, status: 'ok', name: data.name, id: row.id });
        inserted++;
      }
    } catch (err) {
      errors++;
      results.push({ row: i + 2, status: 'error', name: data.name, error: String(err) });
    }
  }

  return NextResponse.json(
    { dryRun, inserted, errors, total: dataRows.length, results },
    { status: 200 },
  );
}
