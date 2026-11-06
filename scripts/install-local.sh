#!/bin/sh
# Install this checkout into the dsh desktop profile and bump the version pin.
# Quit dsh first (⌘Q), then start it again afterwards.
set -e
HERE="$(cd "$(dirname "$0")/.." && pwd)"
PROFILE="${DSH_PROFILE:-$HOME/.dsh/profiles/desktop}"
DEST="$PROFILE/node_modules/dsh-small-toolkit"
if pgrep -f "DeepSeek Harness.app/Contents/MacOS" >/dev/null 2>&1; then
  echo "dsh is still running — quit it (⌘Q) and run this again." >&2
  exit 1
fi
VERSION="$(node -p "require('$HERE/package.json').version")"
rm -rf "$DEST"
mkdir -p "$DEST"
cp -R "$HERE/lib" "$HERE/cordis.patch.yml" "$HERE/LICENSE" "$HERE/README.md" "$HERE/CHANGELOG.md" "$HERE/package.json" "$DEST/"
node -e "
const fs=require('fs'),p='$PROFILE/package.json',d=JSON.parse(fs.readFileSync(p,'utf8'));
d.dependencies['dsh-small-toolkit']='github:HanYu-me/dsh-small-toolkit#v$VERSION';
fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');"
echo "installed dsh-small-toolkit $VERSION into $DEST — start dsh."
