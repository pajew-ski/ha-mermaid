import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";
import terser from "@rollup/plugin-terser";
import json from "@rollup/plugin-json";

export default {
  input: "src/mermaid-card.ts",
  output: {
    file: "dist/ha-mermaid.js",
    format: "es",
    inlineDynamicImports: true,
  },
  plugins: [
    resolve({ browser: true }),
    commonjs(),
    json(),
    typescript(),
    terser({
      output: {
        comments: false,
      },
    }),
  ],
};
