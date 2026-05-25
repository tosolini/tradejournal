FROM node:lts-alpine3.23

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app

CMD ["npm", "run", "dev"]
