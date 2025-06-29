import { defineConfig } from "tsup";

export default defineConfig({
    entry: ["src/index.ts"],
    outDir: "dist",
    sourcemap: true,
    clean: true,
    format: ["esm"],
    external: ["@elizaos/core"],
    dts: false,
    treeshake: true,
    splitting: false,
    bundle: true,
    target: "esnext"
});