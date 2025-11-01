# 1. Base Image: Start from the official Node.js image, using the current LTS version.
FROM node:24-alpine

# 2. Working Directory: Set the directory inside the container
WORKDIR /usr/src/app

# 3. Copy only the package.json and package-lock.json files first.
# This allows Docker to cache the 'npm install' step efficiently.
COPY package*.json ./

# 4. Install Dependencies: Install all project dependencies (including express).
# This assumes you have run 'npm init -y' and 'npm install express --save' on your host.
RUN npm install

# 5. Copy Application Code: Copy the rest of the application files (server.js, app.js, routes/).
# The dot '.' copies everything from the current host directory to the WORKDIR in the container.
COPY . .

# 6. Expose Port: Inform Docker that the container listens on this port.
EXPOSE 4000

# 7. Command to Run: Execute the server script (the entry point for your application).
CMD [ "node", "server.js" ]