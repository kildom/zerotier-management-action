#!/bin/bash
set -e -E -o pipefail
trap 'err=$? && echo "::error::$BASH_SOURCE:$LINENO: Failed with status $err at command: $BASH_COMMAND" && exit $err' ERR
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


function setup_zerotier {
    # action inputs: INPUT_IDENTITY, INPUT_NETWORK_ID
    # action outputs: OUTPUT_IP
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
    echo "You have to authorize this node in ZeroTier Central admin panel if this is the first use of the identity in the network."
    while ! [[ $(sudo zerotier-cli info | grep ONLINE) ]]; do echo "Not connected. Waiting..."; sleep 1; done
    while ! (sudo zerotier-cli -j listnetworks | node dist/tools.js assigned); do echo "IP address not assigned. Waiting..."; sleep 1; done
    sudo zerotier-cli -j listnetworks | node dist/tools.js ip > $OUTPUT_IP
    echo IP address: `cat $OUTPUT_IP`
}

function cleanup_zerotier {
    # action inputs: INPUT_IDENTITY, INPUT_NETWORK_ID
    # parameters: ZEROTIER_DIR

    sudo zerotier-cli leave $INPUT_NETWORK_ID
    while [[ $(sudo zerotier-cli info | grep ONLINE) ]]; do echo "Still connected. Waiting..."; sleep 1; done
    echo "Disconnected"
}
