/// <reference types="vite/client" />

// Without this, TypeScript would complain when a component imports from
// a `.module.css` file. Vite handles the actual import at build time.
declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Same goes for SVGs imported as URLs (favicon, etc).
declare module '*.svg' {
  const src: string;
  export default src;
}
