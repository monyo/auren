import { subscribe, unsubscribe } from '@/lib/sse'

export const dynamic = 'force-dynamic'

const encoder = new TextEncoder()

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  let controller: ReadableStreamDefaultController<Uint8Array>
  let keepaliveTimer: ReturnType<typeof setInterval>

  const stream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c
      subscribe(`post:${id}`, c)
      c.enqueue(encoder.encode(': connected\n\n'))

      keepaliveTimer = setInterval(() => {
        try {
          c.enqueue(encoder.encode(': keepalive\n\n'))
        } catch {
          clearInterval(keepaliveTimer)
        }
      }, 25000)
    },
    cancel() {
      unsubscribe(`post:${id}`, controller)
      clearInterval(keepaliveTimer)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
