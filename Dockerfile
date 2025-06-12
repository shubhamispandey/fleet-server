
FROM node:22
WORKDIR /app
COPY . /app
RUN npm install
ENV PORT 8002
EXPOSE 8002
CMD ["npm", "start"]