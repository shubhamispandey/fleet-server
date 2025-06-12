FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
ENV PORT=8002

EXPOSE 8002

CMD ["npm", "start"]