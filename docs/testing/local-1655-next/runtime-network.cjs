// Test artifact only: permit exact local API/Web ports and the parent-owned PG socket.
const net = require("node:net"),
  dns = require("node:dns"),
  tls = require("node:tls");
const socket = process.env.MN_1655_PG_SOCKET;
if (!socket || !/^\/(?:private\/)?tmp\/mn-1655-pg\.[A-Za-z0-9]+$/.test(socket))
  throw Error("Missing owned synthetic PG socket");
const allowedPort = (p) => [43165, 43166].includes(Number(p));
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  let first = args[0];
  if (Array.isArray(first)) first = first[0];
  const ok =
    typeof first === "string"
      ? first === socket + "/.s.PGSQL.55465"
      : typeof first === "object" && first
        ? first.path === socket + "/.s.PGSQL.55465" ||
          (first.host === "127.0.0.1" && allowedPort(first.port))
        : typeof first === "number" &&
          allowedPort(first) &&
          args[1] === "127.0.0.1";
  if (!ok) throw Error("Synthetic Next runtime forbids external socket");
  return originalConnect.apply(this, args);
};
dns.lookup = (host, options, callback) => {
  if (host !== "127.0.0.1") throw Error("Synthetic Next runtime forbids DNS");
  const cb = typeof options === "function" ? options : callback;
  queueMicrotask(() =>
    options?.all ? cb(null, [{ address: host, family: 4 }]) : cb(null, host, 4),
  );
};
for (const key of ["resolve", "resolve4", "resolve6"])
  dns[key] = dns.promises[key] = () => {
    throw Error("Synthetic Next runtime forbids DNS");
  };
tls.connect = () => {
  throw Error("Synthetic Next runtime forbids TLS");
};
const nativeFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const url = new URL(
    typeof input === "string" || input instanceof URL ? input : input.url,
  );
  if (
    url.hostname !== "127.0.0.1" ||
    !allowedPort(url.port) ||
    url.protocol !== "http:"
  )
    throw Error("Synthetic Next runtime forbids external fetch");
  return nativeFetch(input, init);
};
