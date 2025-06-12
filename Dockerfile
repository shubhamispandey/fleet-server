
FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
ENV PORT 8002
EXPOSE 8002
CMD ["npm", "start"]