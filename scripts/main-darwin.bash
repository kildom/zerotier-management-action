#!/bin/bash
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/common.bash"

ZEROTIER_DIR="/Library/Application Support/ZeroTier/One"
ZEROTIER_OWNER=root:admin

setup_zerotier
