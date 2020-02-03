// @ts-check

const { readFileSync } = require("fs");
const { execSync } = require("child_process");

const optionalTag = process.argv.slice(2)[0];


const exec = (cmd, opts) => {
  console.log(`> ${cmd} ${opts ? JSON.stringify(opts) : ""}`);
  try {
    return execSync(cmd, opts);
  } catch (error) {
    console.error(error.message);
  }
};

const step = msg => console.log("\n\n - " + msg);

function main() {
  console.log("## Creating build of Monaco Editor");
  process.stdout.write("> node publish-monaco-editor.js");

  const typescriptPackageJSON = JSON.parse(readFileSync("monaco-editor/package.json", "utf8"))
  const safeTypeScriptPackage = typescriptPackageJSON.version;

  // Upload the full monaco-editor
  step("Uploading Monaco");
  exec("rm -rf releases")
  exec("mkdir releases")
  exec(`mkdir releases/${safeTypeScriptPackage}`)
  exec(`cp -r monaco-editor/release releases/${safeTypeScriptPackage}/monaco/`)
  
  // This is basically for nightlies, but if a 2nd arg is passed then we include a duped copy of the 
  // monaco-editor and monaco-typescript with the tag which was passed as an arg to the script
  if (optionalTag) {
    exec(`cp -r monaco-editor/release releases/${optionalTag}/monaco/`)
  }

  step("Uploading TypeScript");
  exec(`cp -r monaco-editor/node_modules/typescript releases/${safeTypeScriptPackage}/typescript`)
  if (optionalTag) {
    exec(`cp -r monaco-editor/node_modules/typescript releases/${optionalTag}/typescript`)
  }

  exec(`az storage blob upload-batch -s releases/ -d cdn`)

  step("Updating an index");
  //  Make sure we have some kind of index
  const isPreRelease = safeTypeScriptPackage.includes("-")
  const filename = isPreRelease ? "pre-releases.json" : "releases.json"

  exec(`az storage blob download -c indexes -n ${filename} -f ${filename}`)
  exec(`json -I -f indexes.json -e "this.versions = Array.from(new Set([...this.versions, '${safeTypeScriptPackage}'])).sort()"`)
  exec(`az storage blob upload  -f ${filename} -c indexes -n ${filename}`)

  step("Done!");
}

main();
