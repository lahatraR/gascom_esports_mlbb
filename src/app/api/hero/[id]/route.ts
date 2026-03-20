import { NextRequest, NextResponse } from 'next/server';

// Development-only proxy — not called by the client app.
// generateStaticParams returns [] so Next.js generates no static files
// for this route during `output: 'export'` builds.
export function generateStaticParams() { return []; }

const BASE_URL = 'https://mlbb-stats.rone.dev/api';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const type   = req.nextUrl.searchParams.get('type') ?? 'relation';

  const pathMap: Record<string, string> = {
    relation:      `/hero-relation/${encodeURIComponent(id)}/`,
    counter:       `/hero-counter/${encodeURIComponent(id)}/`,
    compatibility: `/hero-compatibility/${encodeURIComponent(id)}/`,
  };

  const path = pathMap[type] ?? pathMap.relation;

  try {
    const res  = await fetch(`${BASE_URL}${path}`, { next: { revalidate: 300 } });
    const json = await res.json();
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ data: null, error: String(err) }, { status: 200 });
  }
}
