#!/bin/bash

sudo zerotier-cli leave $INPUT_NETWORK_ID
sleep 1
sudo systemctl stop zerotier-one
sleep 4
