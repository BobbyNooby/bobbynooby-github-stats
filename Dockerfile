FROM oven/bun:1
WORKDIR /app
ENV NODE_ENV=production

COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

COPY src ./src

EXPOSE 3001

CMD ["bun", "run", "src/index.ts"]
