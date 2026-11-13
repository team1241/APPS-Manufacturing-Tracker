import { registerHooks } from "node:module";

// Next resolves these imports in production. Node's test runner needs the same
// extension lookup and a marker stub to exercise server modules with mocked fetch.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export {};", shortCircuit: true };
    if (specifier.startsWith("./") && !/\.[a-z]+$/.test(specifier) && context.parentURL?.includes("/src/")) {
      return nextResolve(`${specifier}.ts`, context);
    }
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});
