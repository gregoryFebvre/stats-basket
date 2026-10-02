// jsdom n'implémente pas ResizeObserver, requis par ResponsiveContainer (Recharts).
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= ResizeObserverStub;
