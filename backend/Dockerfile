# backend/Dockerfile
# What: the "packing recipe" that seals the compiled backend code into a
# container image AWS Lambda can run.
#
# Two stages, on purpose:
#   1. "build" - a full Node environment that compiles TypeScript -> JavaScript
#   2. final   - AWS's official Lambda base image, holding ONLY the compiled
#                output and production dependencies (no TypeScript compiler,
#                no dev tools) - keeps the shipped image smaller and leaner.
#
# IMPORTANT when building: modern Docker (BuildKit) attaches "attestation"
# metadata (provenance/SBOM) to images by default, which AWS Lambda cannot
# read - it rejects the image with "manifest ... not supported." Always
# build with both flags disabled:
#   docker build --provenance=false --sbom=false -t budget-app-dev .
# After pushing, Lambda also needs to be told to actually use the new image
# (the ":latest" tag alone doesn't trigger this automatically):
#   aws lambda update-function-code --function-name budget-app-dev --image-uri <ecr-url>:latest

FROM node:20-slim AS build
WORKDIR /app

# Copy just the dependency manifests first so Docker can reuse this layer
# (skip re-downloading packages) whenever only the source code changes.
COPY package*.json tsconfig.json ./
RUN npm ci

COPY src ./src
RUN npm run build

# Drop devDependencies (TypeScript, @types/*) - the compiled JS doesn't need
# them to run, only to build.
RUN npm prune --omit=dev

# --- Final image: AWS's own pre-built Lambda Node.js base ---
FROM public.ecr.aws/lambda/nodejs:20

COPY --from=build /app/dist/ ${LAMBDA_TASK_ROOT}/
COPY --from=build /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules

# Tells Lambda which function to call: the `handler` export in handler.js.
CMD ["handler.handler"]
