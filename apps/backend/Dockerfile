FROM node:20-slim AS builder
WORKDIR /repo

COPY package.json package-lock.json* ./
COPY packages/shared-types/package.json packages/shared-types/
COPY apps/backend/package.json apps/backend/

RUN npm install --workspaces --include-workspace-root

COPY packages/shared-types packages/shared-types
COPY apps/backend apps/backend

RUN npm run build --workspace=packages/shared-types
RUN npm run build --workspace=apps/backend

# Copy the ABI file into dist manually - tsc doesn't copy non-.ts files.
RUN cp -r apps/backend/src/abi apps/backend/dist/abi

# ---- Runtime stage ----
FROM node:20-slim AS runtime
WORKDIR /repo

ENV NODE_ENV=production

# Copy the ENTIRE built /repo tree rather than cherry-picking individual
# folders. npm workspaces can place dependencies in either the root
# node_modules or a nested workspace-level node_modules depending on
# version resolution - copying everything guarantees both locations
# (and anything else npm install produced) come along correctly, instead
# of silently missing a package that happened to land in the "wrong" spot.
COPY --from=builder /repo /repo

EXPOSE 4000
CMD ["node", "apps/backend/dist/server.js"]