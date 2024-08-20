import { defineConfig } from "tsup";

export default defineConfig((options) => ({
  clean: true,
  entry: ["./src/index.ts"],
  format: ["esm"],
  dts: true,
  outDir: "dist",
  sourcemap: true,
  treeshake: true,
  ...options,
}));
