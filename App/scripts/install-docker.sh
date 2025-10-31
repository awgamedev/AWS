#!/bin/bash

# =========================================================
# Variables to store at the top
# Adjust these if you are using a different Linux distribution
# =========================================================
USER_TO_ADD=$(whoami)
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
# =========================================================

echo "Update and Upgrade Ubuntu"

sudo apt-get update -y && sudo apt-get upgrade -y

echo "Starting Git Installation on AWS EC2..."

sudo apt-get install git -y

echo "Starting Docker Installation on AWS EC2..."

# Install Docker
echo "Installing Docker..."
# Add Docker's official GPG key:
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y

sudo systemctl start docker

echo "Docker installation and setup complete!"

echo "--------------------------------"
echo "Install Docker Compose"

sudo apt-get install docker-compose-plugin
docker compose version