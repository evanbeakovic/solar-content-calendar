import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')
  const filename = searchParams.get('filename') || 'image.jpg'

  if (!url) return NextResponse.json({ error: 'No URL provided' }, { status: 400 })

  const response = await fetch(url)
  const blob = await response.arrayBuffer()
  const contentType = response.headers.get('content-type') || 'image/jpeg'

  return new NextResponse(blob, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}