#!/usr/bin/env bash

set -e

KEYBASE_BINARY=./dist/keybase
if [ -f "${KEYBASE_BINARY}" ]; then
  echo "Keybase binary already exists, nothing to do here."
  exit 0
fi

curl --remote-name https://prerelease.keybase.io/keybase_amd64.deb
dpkg --fsys-tarfile keybase_amd64.deb | tar xOf - ./usr/bin/keybase > ${KEYBASE_BINARY}
rm -f keybase_amd64.deb
chmod +x ${KEYBASE_BINARY}
