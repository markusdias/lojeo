import { NextResponse } from 'next/server';
import { buildShippingOptions } from '../../../../lib/shipping/options';
import { asSupportedCurrency } from '@lojeo/engine';
import { getActiveTemplate } from '../../../../template';

export const dynamic = 'force-dynamic';

interface QuoteRequest {
  country?: string;
  postalCode?: string;
  subtotalCents?: number;
  weightG?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as QuoteRequest;
    const tpl = await getActiveTemplate();
    const currency = asSupportedCurrency(tpl.currency);

    const country = (body.country ?? '').toUpperCase() || (currency === 'BRL' ? 'BR' : 'US');
    const postalCode = body.postalCode ?? '';
    const subtotalCents = Math.max(0, Number(body.subtotalCents ?? 0));
    const weightG = body.weightG && body.weightG > 0 ? body.weightG : 500;

    const options = await buildShippingOptions({
      country,
      postalCode,
      subtotalCents,
      currency,
      weightG,
    });

    return NextResponse.json({ options, currency, country });
  } catch (err) {
    console.error('[POST /api/shipping/quote]', err);
    return NextResponse.json({ error: 'Falha ao cotar frete' }, { status: 500 });
  }
}
