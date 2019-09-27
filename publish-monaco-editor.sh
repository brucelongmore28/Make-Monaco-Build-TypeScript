# This script takes an arg which is passed as the TypeScript version
# so, ./publish-monaco-editor.sh 3.6.3 would generate a build for 3.6.3
# it defaults to next for daily builds.

MONACO_TS_VERSION=${1:-nightly}

 if [ -z "$1" ]
   then
     NPM_TAG="--tag nightly"
 else
     NPM_TAG=""
 fi

git clone https://github.com/microsoft/monaco-editor.git
cd monaco-editor

json -I -f package.json -e "this.name='@typescript-deploys/monaco-editor'" 

# Yarn supports aliasing a module, so we can use the fork and pretend
# to be the real version of the module.
yarn add --dev "monaco-typescript@npm:@typescript-deploys/monaco-typescript@$MONACO_TS_VERSION"

# Match the version to the monaco-ts version
json -I -f package.json -e "this.version='$(json -f node_modules/monaco-typescript/package.json version)'" 

echo 'Starting gulp release'

# Create a release build, this makes a new sub-folder called release with the module
gulp release
cd release

npm publish --access public $NPM_TAG

cd ..
