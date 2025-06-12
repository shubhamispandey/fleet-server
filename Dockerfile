
FROM node:22
WORKDIR /app
COPY . /app
RUN npm install
# list directory
RUN ls -al
ENV PORT 8002
EXPOSE 8002
RUN pwd
RUN ls -al
CMD ["npm", "start"]