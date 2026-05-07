type Controller = ReadableStreamDefaultController<Uint8Array>

const subscribers = new Map<string, Set<Controller>>()
const encoder = new TextEncoder()

export function subscribe(channel: string, controller: Controller) {
  if (!subscribers.has(channel)) subscribers.set(channel, new Set())
  subscribers.get(channel)!.add(controller)
}

export function unsubscribe(channel: string, controller: Controller) {
  const set = subscribers.get(channel)
  if (!set) return
  set.delete(controller)
  if (set.size === 0) subscribers.delete(channel)
}

export function broadcast(channel: string, event: string, data: unknown) {
  const clients = subscribers.get(channel)
  if (!clients || clients.size === 0) return
  const message = encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
  for (const controller of clients) {
    try {
      controller.enqueue(message)
    } catch {
      clients.delete(controller)
    }
  }
}
