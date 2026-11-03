import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 140,
  singleQuote: false,
  useTabs: false,
  tabWidth: 2,
  endOfLine: "lf",
  trailingComma: "all",
  // The iOS/macOS Xcode project is maintained with Swift tooling, not the web toolchain.
  ignorePatterns: ["Tracking Tag Remover for Amazon/"],
});
