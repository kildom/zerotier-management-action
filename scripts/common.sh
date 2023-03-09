#!/bin/bash
#set -e -E -o pipefail
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
    while ! [[ $(sudo zerotier-cli listnetworks | grep $INPUT_NETWORK_ID) ]]; do echo "Not in the network. Waiting..."; sleep 1; done
    while ! [[ $(sudo zerotier-cli get $INPUT_NETWORK_ID ip4) ]]; do echo "IP address not assigned. Waiting..."; sleep 1; done
    sudo zerotier-cli get $INPUT_NETWORK_ID ip4 > $OUTPUT_IP
    echo IP address: `cat $OUTPUT_IP`
}

function cleanup_zerotier {
    # action inputs: INPUT_NETWORK_ID

    sudo zerotier-cli leave $INPUT_NETWORK_ID
    i=0
    while [[ $(sudo zerotier-cli listnetworks | grep $INPUT_NETWORK_ID) ]]; do
        echo -------------
        sudo zerotier-cli listnetworks
        echo -------------
        sudo zerotier-cli listnetworks | grep $INPUT_NETWORK_ID
        echo -------------
        sudo zerotier-cli listnetworks | grep $INPUT_NETWORK_ID > a.txt
        ls -la
        echo -------------
        echo "Still in the network. Waiting..."
        sleep 1
        if [[ "$i" == "60" ]]; then break; fi
        ((i++))
    done
    sleep 1;
    echo "Disconnected"
}
