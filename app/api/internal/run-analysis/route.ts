import { NextResponse } from 'next/server';
import { startAnalysisWorkerLoop } from '../../../../scripts/analysisWorker';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: Request) {
  const requestStart = Date.now();

  try {
    // Auth check
    const authHeader = request.headers.get('authorization');

  const url = new URL(request.url);
  const budgetParam = url.searchParams.get('timeBudgetMs');
  const timeBudgetMs = budgetParam ? parseInt(budgetParam, 10) : 240_000;

  if (Number.isNaN(timeBudgetMs) || timeBudgetMs < 10_000) {
    return NextResponse.json(
      { error: 'timeBudgetMs must be at least 10000ms' },
      { status: 400 },
    );
  }

  console.log(`Starting analysis cron run (budget: ${timeBudgetMs}ms)...`);

  try {
    const metrics = await startAnalysisWorkerLoop({
      timeBudgetMs,
    });

    console.log(`Finished analysis cron run. Summary:`, metrics);

    return NextResponse.json({
      success: metrics.success,
      message: 'Analysis worker execution completed',
      metrics,
    });
  } catch (error: any) {
    console.error('run-analysis cron error:', error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({
      error: 'Internal server error',
      success: false,
    }, { status: 500 });
  }
}
