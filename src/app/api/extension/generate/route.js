import { NextResponse } from 'next/server';
import { generateExtensionWorkflows } from '@/lib/extension/generator';

export async function POST(request) {
  try {
    const config = await request.json();

    if (!config || !config.extensionFramework) {
      return NextResponse.json(
        { error: 'Missing required config field: extensionFramework' },
        { status: 400 }
      );
    }

    const files = generateExtensionWorkflows(config);
    return NextResponse.json({ success: true, files });
  } catch (err) {
    console.error('Generation error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
