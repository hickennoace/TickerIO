import { NextRequest } from "next/server";
import { quote } from "@/lib/market";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Server-Sent Events price stream. Emits a price tick every few seconds for ~45s,
 * then closes — the browser's EventSource auto-reconnects, giving a continuous
 * live feed that stays within serverless function limits (CLAUDE.md §6/§Phase 9).
 */
export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get("symbol");
  if (!symbol) return new Response("symbol required", { status: 400 });

  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          /* controller closed */
        }
      };

      // Ask the browser to reconnect quickly after we close.
      controller.enqueue(encoder.encode("retry: 2000\n\n"));

      const started = Date.now();
      let stopped = false;
      const stop = () => {
        if (stopped) return;
        stopped = true;
        if (timer) clearInterval(timer);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", stop);

      const tick = async () => {
        if (stopped) return;
        if (Date.now() - started > 45_000) return stop();
        try {
          const { value, stale } = await quote(symbol);
          send("price", {
            symbol: value.symbol,
            price: value.price,
            change: value.change,
            changePct: value.changePct,
            asOf: value.asOf,
            stale,
          });
        } catch {
          /* skip this tick */
        }
      };

      await tick();
      timer = setInterval(tick, 5000);
    },
    cancel() {
      if (timer) clearInterval(timer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
