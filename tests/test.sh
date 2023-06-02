#!/bin/bash
set -e -E -o pipefail
trap 'err=$? && echo "::error::$BASH_SOURCE:$LINENO: Failed with status $err at command: $BASH_COMMAND" && exit $err' ERR

npm run build
#read -es INPUT_AUTH_TOKEN
#export INPUT_AUTH_TOKEN
export INPUT_API_URL=https://my.zerotier.com/api/v1
export INPUT_IP_VERSION=4
export INPUT_WAIT_FOR='[name=TestServer1] [name=TestServer2] [name=StopTestServers] [name^=tester-]'
export INPUT_TIMEOUT=300
export INPUT_WAIT_FOR_UNAVAILABLE=true

node dist/main.js

