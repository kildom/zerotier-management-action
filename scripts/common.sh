#!/bin/bash
set -e -E -o pipefail
trap 'err=$? && echo "::error::$BASH_SOURCE:$LINENO: Failed with status $err at command: $BASH_COMMAND" && exit $err' ERR
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
SCRIPTS_DIR=$(realpath $SCRIPTS_DIR)


function setup_zerotier {
    # action inputs: INPUT_IDENTITY, INPUT_NETWORK_ID
    # parameters: ZEROTIER_DIR, ZEROTIER_OWNER

    sudo mkdir -p "$ZEROTIER_DIR"
    echo -n "$INPUT_IDENTITY" > /tmp/identity.secret
    cat /tmp/identity.secret | sed 's|\(.*\):.*|\1|' > /tmp/identity.public
    sudo cp /tmp/identity.secret "$ZEROTIER_DIR/"
    sudo cp /tmp/identity.public "$ZEROTIER_DIR/"
    sudo chown $ZEROTIER_OWNER "$ZEROTIER_DIR/identity.secret"
    sudo chown $ZEROTIER_OWNER "$ZEROTIER_DIR/identity.public"
    sudo chmod 600 "$ZEROTIER_DIR/identity.secret"
    sudo curl -s https://install.zerotier.com | sudo bash
    sudo zerotier-cli join $INPUT_NETWORK_ID

}

