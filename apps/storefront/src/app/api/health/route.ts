import { NextResponse } from 'next/server';
import { getActiveTemplate } from '../../../template';

export async function GET() {
  const tpl = await getActiveTemplate();
  return NextResponse.json({ ok: true, template: tpl.id, locale: tpl.locale });
}
