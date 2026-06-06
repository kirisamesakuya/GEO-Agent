FROM node:20

WORKDIR /app

RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY dist/ ./dist/
COPY prisma/ ./prisma/
RUN npx prisma generate

COPY config/ ./config/
COPY uploads/ ./uploads/

ENV NODE_ENV=production
ENV PORT=3456
ENV DATABASE_URL=file:./dev.db
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-debian-openssl-3.0.x.so.node

EXPOSE 3456
CMD ["node", "dist/server.cjs"]
