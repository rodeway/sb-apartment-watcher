# Use the official Long-Term Support (LTS) version of Node.js.
# The default image is based on Debian, which has better compatibility for
# some Node.js native modules than the lightweight 'alpine' variant.
FROM node:22

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json to leverage Docker's layer caching.
# This step will only re-run if these files change.
COPY package*.json ./

# Install all project dependencies
RUN npm install

# Copy the rest of your application's source code
COPY . .

# The default command to run when the container starts.
CMD ["npm", "start"]