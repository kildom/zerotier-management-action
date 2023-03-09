#!/bin/bash
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/common.sh"

ZEROTIER_DIR="/Library/Application Support/ZeroTier/One"
ZEROTIER_OWNER=root:admin

cleanup_zerotier
