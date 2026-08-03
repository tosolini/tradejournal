FROM node:lts-alpine3.23 AS builder

WORKDIR /app

COPY package.json package-lock.json /app/
RUN npm ci

COPY . /app
RUN npm run build

FROM nginx:alpine
RUN apk upgrade --no-cache && apk add --no-cache gettext

ENV BACKEND_URL=http://backend:8000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template
COPY nginx-envsubst.sh /docker-entrypoint.d/30-envsubst.sh
RUN chmod +x /docker-entrypoint.d/30-envsubst.sh

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
