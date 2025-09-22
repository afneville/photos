FROM public.ecr.aws/docker/library/node:22-slim AS builder

WORKDIR /app

COPY ../../package*.json ./
COPY ../../*.js ./
COPY ../../*.ts ./
COPY ../../src ./src
COPY ../../static ./static

RUN npm ci
RUN npm run prepare
RUN npm run build

FROM public.ecr.aws/docker/library/node:22-slim
COPY --from=public.ecr.aws/awsguru/aws-lambda-adapter:0.9.1 /lambda-adapter /opt/extensions/lambda-adapter
ENV PORT=3000
WORKDIR /var/task
COPY --from=builder /app/build/ /var/task/

CMD ["node", "index.js"]
