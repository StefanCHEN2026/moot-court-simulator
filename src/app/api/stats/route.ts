import { NextResponse } from 'next/server';
import { getTrialCount } from '@/lib/data/stats';

/** GET /api/stats — 累计开庭次数 */
export async function GET() {
  try {
    const totalTrials = await getTrialCount();
    return NextResponse.json({ totalTrials });
  } catch {
    return NextResponse.json({ totalTrials: 0 });
  }
}
