#!/bin/bash
source "$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )/common.sh"

ZEROTIER_DIR=/var/lib/zerotier-one
ZEROTIER_OWNER=zerotier-one:zerotier-one

cleanup_zerotier
