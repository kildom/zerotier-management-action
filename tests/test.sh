#!/bin/bash
set -e -E -o pipefail
trap 'err=$? && echo "::error::$BASH_SOURCE:$LINENO: Failed with status $err at command: $BASH_COMMAND" && exit $err' ERR

npm run build
#export INPUT_AUTH_TOKEN=... Use safer approach:
#       read -es INPUT_AUTH_TOKEN
#       export INPUT_AUTH_TOKEN

export INPUT_API_URL=https://my.zerotier.com/api/v1

export INPUT_IP="fde0::213 192.168.194.213"
#export INPUT_NAME=LinuxPracowy
#export INPUT_DESCRIPTION="Jakiś tam tekst"
export INPUT_TAGS=
export INPUT_CAPABILITIES=
export INPUT_WAIT_FOR='( [tagEnum:department==support] OR [capabilities~=test] ) AND [IPv4Address!=]'
export INPUT_IP_VERSION="4?"
export INPUT_TIMEOUT="100"

pushd ..

node dist/main.js

popd
