import { NextResponse } from 'next/server';
import { generateExtensionWorkflows } from '@/lib/extension/generator';
import { ZipArchive } from 'archiver';

export async function POST(request) {
  try {
    const config = await request.json();

    if (!config || !config.extensionFramework) {
      return NextResponse.json(
        { error: 'Missing required config fields' },
        { status: 400 }
      );
    }

    const files = generateExtensionWorkflows(config);

    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('data', (chunk) => {
      writer.write(chunk);
    });

    archive.on('end', () => {
      writer.close();
    });

    archive.on('error', (err) => {
      writer.abort(err);
    });

    (async () => {
      try {
        for (const [filePath, content] of Object.entries(files)) {
          archive.append(content, { name: filePath });
        }
        await archive.finalize();
      } catch (err) {
        console.error('Archiver error:', err);
        writer.abort(err);
      }
    })();

    return new Response(readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="chrome-extension-workflows.zip"',
      },
    });
  } catch (err) {
    console.error('Download error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
