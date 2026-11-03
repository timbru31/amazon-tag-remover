import { cp } from "node:fs/promises";
import { join, resolve } from "node:path";

const copyFiles = async () => {
  const srcDir = resolve(import.meta.dirname, "../src");
  const distDir = resolve(import.meta.dirname, "../dist");

  try {
    await cp(srcDir, distDir, {
      recursive: true,
      filter: (src) => {
        const jsDir = join(srcDir, "js");
        return !src.startsWith(jsDir);
      },
    });
    console.log("Files copied successfully!");
  } catch (err) {
    console.error("Error copying files:", err);
    process.exit(1);
  }
};

copyFiles();
