FROM public.ecr.aws/docker/library/node:22-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*

COPY *.json ./
COPY *.js ./
COPY *.ts ./
COPY .git ./.git
COPY src ./src
COPY static ./static

RUN npm ci
RUN npm run prepare
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-slim
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=3000
WORKDIR /var/task

COPY --from=builder /app/package.json /var/task/package.json
COPY --from=builder /app/package-lock.json /var/task/package-lock.json
RUN npm ci --omit=dev
COPY --from=builder /app/build/ /var/task/

CMD ["node", "index.js"]
