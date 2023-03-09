#!/bin/bash
set -e -o pipefail
SCRIPTS_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
SCRIPTS_DIR=$(realpath $SCRIPTS_DIR)

cd $SCRIPTS_DIR/../pages
php -S 127.0.0.1:8930
