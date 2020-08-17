// @ts-check

const { execSync } = require("child_process");
const { existsSync, readFileSync, writeFileSync } = require("fs");
const args = process.argv.slice(2);

const exec = (cmd, opts) => {
    console.log(`> ${cmd} ${opts ? JSON.stringify(opts) : ""}`);
    return execSync(cmd, opts);
};

const step = (msg) => console.log("\n\n - " + msg);

function main() {

  // TypeScript calls nightlies next... So should we.
  const typescriptTag = args[0] ? args[0] : "next"
  const isPushedTag = process.env.GITHUB_EVENT_NAME === "push"
  const tagPrefix = isPushedTag || args[0].includes("http") ? "" : `--tag ${typescriptTag}`

  console.log("## Creating build of Monaco TypeScript");
  process.stdout.write("> node publish-monaco-ts.js");

  if (existsSync("monaco-typescript")) exec("rm -rf monaco-typescript")

  // Create a tarball of the current version
  step("Cloning the repo");
  exec("git clone https://github.com/microsoft/monaco-typescript.git");

  const execMTS = (cmd) => exec(cmd, { cwd: "monaco-typescript" })

  execMTS(`git config --global user.email "you@example.com"`)
  execMTS(`git config --global user.name "Your Name"`)


  step("Installing NPM");
  execMTS("npm i")

  execMTS("git fetch")

  // https://github.com/microsoft/monaco-typescript/pull/64
  execMTS("git merge origin/let_ts_resolve_libs")

  // Grab the username from NPM
  const user = execMTS("npm whoami").toString().trim()

  step("Overwriting the version of TypeScript in Monaco TypeScript");
  execMTS(`npm install --save "typescript@${typescriptTag}"`)

  step("Updating the internal version of TS inside monaco");
  execMTS("npm run import-typescript");
  
  step("Adding Type Definitions and Source Map support");
  execMTS(`json -I -f src/tsconfig.json -e "this.compilerOptions.declaration=true"`)
  execMTS(`json -I -f src/tsconfig.json -e "this.compilerOptions.sourceMap=true"`)

  let version = args[1] 
  if (version) {
    step(`Setting the version to ${version}`);
  } else {
    step("Grabbing the version from the TypeScript build");
    version = execMTS("json -f node_modules/typescript/package.json version").toString().trim()
  }
  execMTS(`json -I -f package.json -e "this.version='${version}'"`)
  
  step("Setting the name");
  execMTS(`json -I -f package.json -e "this.name='@${user}/monaco-typescript'"`)

  step("Publishing to NPM");
  try {
    // Support this command failing when pushing a dupe
    execMTS(`npm publish --access public ${tagPrefix}`)
  } catch (error) {
    console.log(error.message)
    
    if (!error.message.includes("previously published versions")) {
      throw error
    }
  }
}

main()
