import { NextResponse } from 'next/server';
import { generateWorkflows } from '@/lib/generator';

export async function POST(request) {
  try {
    const config = await request.json();

    if (!config || !config.projectType || !config.deployTarget) {
      return NextResponse.json(
        { error: 'Missing required config fields: projectType, deployTarget' },
        { status: 400 }
      );
    }

    const files = generateWorkflows(config);
    return NextResponse.json({ success: true, files });
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
