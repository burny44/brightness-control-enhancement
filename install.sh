#!/usr/bin/env bash
set -euo pipefail

UUID="brightness-control-enhancement@burny"
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="${HOME}/.local/share/gnome-shell/extensions/${UUID}"

mkdir -p "$(dirname "${DEST}")"
ln -sfn "${SRC}" "${DEST}"

echo "Linked ${DEST} -> ${SRC}"
echo "Restart GNOME Shell, then: gnome-extensions enable ${UUID}"
