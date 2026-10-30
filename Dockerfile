FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY recordings ./recordings
COPY drizzle ./drizzle
ENV HOST=0.0.0.0 PORT=10000 QUOTA_DB_PATH=/data/quota.sqlite
RUN mkdir /data && chown node:node /data /app
USER node
EXPOSE 10000
CMD ["npm","start"]
