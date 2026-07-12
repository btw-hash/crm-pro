# Fake ERP — a minimal image (zero-dep, only node:http).
# Used by the docker-compose.demo.yml demo composition.
FROM node:22-alpine
WORKDIR /srv
COPY server.mjs data.mjs ./
ENV MOCK_ERP_PORT=8108
# State storage (orders/reservations) on a volume — survives a restart. The
# directory is created under uid 1000 (node) so a named volume mounted here is writable.
ENV MOCK_ERP_STORE=/data/state.json
RUN mkdir -p /data && chown node:node /data
EXPOSE 8108
# Unprivileged user (the node:alpine image ships uid 1000 "node").
USER node
CMD ["node", "server.mjs"]
