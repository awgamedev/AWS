#!/bin/bash

# Build the docker container
docker build --no-cache -t node-web-app .
# Start the App on port 3000
docker run -d -p 3000:3000 --name web-server node-web-app