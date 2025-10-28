#!/bin/bash

# =========================================================
# Variables to store at the top
# Adjust these if you are using a different Linux distribution
# =========================================================
USER_TO_ADD=$(whoami)
SERVICE_NAME="docker"
# =========================================================

echo "Starting Docker Installation on AWS EC2..."

# 1. Update the instance packages
echo "Running system update..."
sudo yum update -y

# 2. Install Docker
echo "Installing Docker..."
sudo yum install docker

# Check if Docker installation was successful
if [ $? -ne 0 ]; then
    echo "Docker installation failed. Exiting."
    exit 1
fi

# 3. Start and enable the Docker service
echo "Starting and enabling the Docker service..."
sudo service $SERVICE_NAME start
sudo systemctl enable $SERVICE_NAME

# 4. Add the current user to the docker group
echo "Adding user '$USER_TO_ADD' to the 'docker' group..."
sudo usermod -aG $SERVICE_NAME $USER_TO_ADD

echo "Docker installation and setup complete!"
echo ""
echo "--- IMPORTANT NEXT STEP ---"
echo "You must log out and log back in (or run 'newgrp docker') for the user changes to take effect."
echo "Once you've done that, run 'sudo docker run hello-world' to test the installation."