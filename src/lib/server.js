const startServer = (server, callback) => {
  server.listen(process.env.PORT, "0.0.0.0", () => {
    console.log(`2. Server: Running on port ${process.env.PORT}`);
    if (callback)
      callback().then(() => {
        console.log("===============================================");
      });
  });
  server.on("error", (error) => {
    console.error("Server error:", error);
  });
};

export default startServer;
