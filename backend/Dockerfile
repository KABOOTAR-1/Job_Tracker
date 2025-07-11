FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5000

# Set environment variables (override in docker-compose or at runtime)
ENV NODE_ENV=production

CMD ["node", "server.js"]