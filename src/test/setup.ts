import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});

class ResizeObserverPolyfill {
  observe() {}
  unobserve() {}
  disconnect() {}
}
// @ts-expect-error jsdom does not implement ResizeObserver
globalThis.ResizeObserver = globalThis.ResizeObserver || ResizeObserverPolyfill;
