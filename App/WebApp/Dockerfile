# 1. Base Image: Start from the official Node.js image, using the current LTS version.
FROM node:24-alpine AS build

# 2. Working Directory: Set the directory inside the container
WORKDIR /usr/src/app

COPY package*.json ./
RUN npm ci --omit=dev

# Löscht unnötige Dokumentation und Build-Artefakte aus node_modules, um das Image zu verkleinern
RUN find node_modules -type f -name '*.md' -delete && \
    find node_modules -type f -name '*.ts' -delete && \
    find node_modules -type f -name '*.flow' -delete && \
    find node_modules -type d -name '__tests__' -exec rm -rf {} + && \
    find node_modules -type d -name 'test' -exec rm -rf {} + && \
    npm cache clean --force

RUN rm -rf /tmp/* && \
    rm -rf /root/.npm

# 5. Copy Application Code: Copy the rest of the application files (server.js, app.js, routes/).
# The dot '.' copies everything from the current host directory to the WORKDIR in the container.
COPY . .

FROM node:24-slim AS final

WORKDIR /usr/src/app

ENV NODE_ENV=production
WORKDIR /usr/src/app
COPY --from=build /usr/src/app/node_modules ./node_modules
COPY . .

# 6. Expose Port: Inform Docker that the container listens on this port.
EXPOSE 4000

# 7. Command to Run: Execute the server script (the entry point for your application).
CMD [ "node", "server.js" ]