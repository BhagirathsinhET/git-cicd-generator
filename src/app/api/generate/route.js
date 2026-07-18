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

    if (!isValidNodeVersion(config.nodeVersion)) {
      return NextResponse.json(
        { error: 'Node.js version must look like 22, 22.x, or 22.14.0' },
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

function isValidNodeVersion(version) {
  return typeof version === 'string' && /^v?\d+(?:\.(?:\d+|x)){0,2}$/.test(version.trim());
}
