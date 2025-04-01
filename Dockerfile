FROM oven/bun:1-alpine AS base
WORKDIR /usr/src/app

FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
COPY patches /temp/prod/patches
RUN cd /temp/prod && bun install --frozen-lockfile --production

FROM base AS prerelease
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src/ src
COPY --from=prerelease /usr/src/app/tsconfig.json tsconfig.json
COPY --from=prerelease /usr/src/app/package.json package.json
COPY --from=prerelease /usr/src/app/scripts scripts
RUN mkdir -p /usr/src/app/logs && chown -R bun:bun /usr/src/app/logs

USER bun
EXPOSE 3025
ENV NODE_ENV=production
ENTRYPOINT [ "bun", "run", "src/index.ts"]
