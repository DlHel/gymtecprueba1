FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

RUN mkdir -p /app/uploads/models /app/uploads/reports

ENV NODE_ENV=production
EXPOSE 3000

CMD ["npm", "start"]
