const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const nocache = require("nocache");
const compression = require("compression");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const RouteV1 = require("./api/routes");
require("dotenv").config();

const cluster = require("cluster");
const process = require("process");
const { cpus } = require("os");

const numCPUs = cpus().length;

if (cluster.isMaster) {
  console.log(`Primary ${process.pid} is running`);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  const app = express();
  // app.use(function (req, res, next) {
  //   res.header("Access-Control-Allow-Origin", "*");
  //   res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
  //   res.header(
  //     "Access-Control-Allow-Headers",
  //     "Content-Type, Origin, X-Requested-With, Accept"
  //   );
  //   next();
  // });
  app.use(compression());
  app.use(
    cors({
      origin: "*",
    })
  );
  app.use(morgan("dev"));
  app.use(
    fileUpload({
      limits: { fileSize: 50 * 1024 * 1024 },
    })
  );
  app.use(bodyParser.json({ limit: "50mb" }));
  app.use(bodyParser.urlencoded({ limit: "50mb", extended: true }));
  app.use(nocache());

  app.use("/static", express.static("static/"));
  app.use("/uploads", express.static("uploads/"));
  app.use(
    "/uploads/category/banner",
    express.static("uploads/category/banner/")
  );

  app.use("/uploads/brand/logo", express.static("uploads/brand/logo/"));
  app.use("/uploads/product/", express.static("uploads/product/"));
  app.use("/uploads/banner/", express.static("uploads/banner/"));
  app.use("/uploads/user/", express.static("uploads/user/"));
  app.use(
    "/uploads/store/campaign/",
    express.static("uploads/store/campaign/")
  );
  app.use(
    "/uploads/store/campaign/review",
    express.static("uploads/store/campaign/review")
  );
  app.use("/uploads/bulkOrder/", express.static("uploads/bulkOrder/"));
  // API Routes
  app.use("/api/v1", RouteV1);

  // Ecommerse Route/
  app.use("/api/v1/e-efg", EcommerseRoute);
  app.get("/", (req, res) => {
    res.send("WOW! You are here.");
  });

  app.use((req, res, next) => {
    let error = new Error("404 Page not found");
    error.status = 404;
    next(error);
  });

  app.use((error, req, res, next) => {
    if (error.status == 404) {
      return res.status(404).json({
        message: error.message,
      });
    }
    if (error.status == 400) {
      return res.status(400).json({
        message: "Bad request",
      });
    }
    if (error.status == 401) {
      return res.status(401).json({});
    }
    return res.status(500).json({
      message: "Internal Server Error",
    });
  });

  // DB Connection here
  mongoose
    .connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      autoIndex: false,
    })
    .then(() => console.log("Database connected"))
    .catch((error) => {
      if (error) console.log("Database connection failed");
    });

  // App Port
  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    console.log(`App running on ${port} port`);
  });
}