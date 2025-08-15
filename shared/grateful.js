// shared/graceful.js
export function wireGracefulShutdown({
  server, // http.Server | undefined
  container, // DI container có resolve('shutdown')
  logger = console,
  timeoutMs = 15000,
  killOnUnhandled = false, // tuỳ chọn: dừng app khi unhandled error
  ignoreSignals = ["SIGHUP", "SIGUSR2"], // bỏ qua đóng terminal & nodemon reload
  handleSignals = ["SIGINT", "SIGTERM"], // chỉ tắt khi Ctrl+C / stop
}) {
  let shuttingDown = false;
  let timer;

  const gracefulShutdown = async (reason = "unknown") => {
    if (shuttingDown) {
      logger.debug(`↩️  Shutdown already in progress (reason=${reason})`);
      return;
    }
    shuttingDown = true;
    logger.warn(`🛑 Starting graceful shutdown (reason=${reason})`);

    timer = setTimeout(() => {
      logger.error(
        `⏱️  Graceful timeout ${timeoutMs}ms reached — forcing exit(1).`
      );
      process.exit(1);
    }, timeoutMs);
    timer.unref?.();

    if (server) {
      try {
        await new Promise((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
        logger.debug(
          "✅ HTTP server closed. No new requests will be accepted."
        );
      } catch (e) {
        logger.error("❌ Error closing HTTP server:", e);
      }
    }

    try {
      const shutdown = container?.resolve?.("shutdown");
      if (typeof shutdown === "function") {
        await shutdown(); // đóng Kafka/Redis/DB…
        logger.debug("✅ Closing connections gracefully.");
      }
    } catch (e) {
      logger.error("❌ Error closing connections:", e);
    }

    clearTimeout(timer);
    logger.warn("👋 Shutdown complete. Exiting now.");
    process.exit(0);
  };

  // Chỉ shutdown khi thật sự stop
  handleSignals.forEach((sig) => {
    try {
      process.once(sig, () => gracefulShutdown(sig));
    } catch {}
  });

  // Bỏ qua các signal gây phiền (đóng terminal, nodemon)
  ignoreSignals.forEach((sig) => {
    try {
      process.on(sig, () =>
        logger.warn(`[signal] ${sig} received → ignoring graceful shutdown`)
      );
    } catch {}
  });

  if (killOnUnhandled) {
    process.on("unhandledRejection", (e) => {
      logger.error("[unhandledRejection]", e);
      gracefulShutdown("unhandledRejection");
    });
    process.on("uncaughtException", (e) => {
      logger.error("[uncaughtException]", e);
      gracefulShutdown("uncaughtException");
    });
  }

  return { gracefulShutdown };
}
