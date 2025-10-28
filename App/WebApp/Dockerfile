# 1. Base Image: Start from the official Node.js image, using the current Long Term Support (LTS) version.
# 'alpine' is recommended for smaller, more secure images.
FROM node:24-alpine

# 2. Working Directory: Set the directory inside the container
WORKDIR /usr/src/app

# 3. Install Dependency: Manually install the Express package globally or locally.
# We'll install it locally in the WORKDIR.
# Note: Installing without package.json is generally not recommended in production.
RUN npm install express

# 4. Copy Application Code: Copy only the server.js file.
# Note: You still need to copy the server.js file from your host to the container.
COPY server.js .

# 5. Expose Port: Inform Docker that the container listens on this port.
EXPOSE 3000

# 6. Command to Run: Execute the server script.
CMD [ "node", "server.js" ]