FROM node:20

WORKDIR /app

# Copy everything from the current context
COPY . .

# Install dependencies
RUN npm install

EXPOSE 5000

ENV NODE_ENV=production

CMD ["node", "server.js"]
