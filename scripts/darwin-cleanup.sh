#!/bin/bash

sudo zerotier-cli leave $INPUT_NETWORK_ID
sleep 1
sudo launchctl unload /Library/LaunchDaemons/com.zerotier.one.plist
sleep 4
