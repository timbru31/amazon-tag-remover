import { readFileSync, writeFileSync } from "fs";
import { version } from "../package.json";

const manifest = JSON.parse(readFileSync("./src/manifest.json", { encoding: "utf-8" }));
manifest.version = version;
writeFileSync("./src/manifest.json", JSON.stringify(manifest, null, "\t"));

const pbxprojPath = "./Tracking Tag Remover for Amazon/Tag Remover for Amazon.xcodeproj/project.pbxproj";
const pbxproj = readFileSync(pbxprojPath, { encoding: "utf-8" });
const build = Number(/CURRENT_PROJECT_VERSION = (\d+);/.exec(pbxproj)?.[1]);
if (!Number.isInteger(build)) {
  throw new Error("CURRENT_PROJECT_VERSION not found in project.pbxproj");
}
writeFileSync(
  pbxprojPath,
  pbxproj
    .replaceAll(/MARKETING_VERSION = [^;]+;/g, `MARKETING_VERSION = ${version};`)
    .replaceAll(/CURRENT_PROJECT_VERSION = \d+;/g, `CURRENT_PROJECT_VERSION = ${build + 1};`),
);
