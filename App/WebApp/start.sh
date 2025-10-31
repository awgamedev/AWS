#!/bin/bash

sudo docker compose up -d --build
echo "Public IP: $(curl -s http://checkip.amazonaws.com):3000"
