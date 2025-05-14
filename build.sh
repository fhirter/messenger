#!/usr/bin/env bash

CONFIG_FILE="./src/config.js"

cp ./src/config_sample.js $CONFIG_FILE

sed -i '' "s/\"API_KEY\": \"[^\"]*\"/\"API_KEY\": \"$API_KEY\"/" "$CONFIG_FILE"

npx vite build