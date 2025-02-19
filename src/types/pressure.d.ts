declare module 'pressure' {
  interface PressureOptions {
    change?: (force: number, event?: Event) => void;
    start?: () => void;
    end?: () => void;
    unsupported?: () => void;
    polyfill?: boolean;
    only?: string;
  }

  interface Pressure {
    set: (
      element: HTMLElement,
      options: PressureOptions,
      block?: { polyfill: boolean; only: string }
    ) => void;
  }

  const pressure: Pressure;
  export default pressure;
} 