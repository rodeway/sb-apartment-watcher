# Use the official Long-Term Support (LTS) version of Node.js.
# The 'alpine' variant is a lightweight version, which is great for development.
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's layer caching.
# This step will only re-run if these files change.
COPY package*.json ./

# Clean the npm cache to ensure fresh packages are downloaded, then install.
# This prevents issues with stale package metadata.
RUN npm cache clean --force && npm install

# Copy the rest of your application's source code
COPY . .

# The default command to run when the container starts.
CMD ["npm", "start"]