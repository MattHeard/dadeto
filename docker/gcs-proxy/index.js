import express from "express";
import { Storage } from "@google-cloud/storage";

const app = express();
const storage = new Storage();
const bucket = process.env.BUCKET;

app.get("/*", (req, res) => {
  const key = req.path.slice(1) || "index.html";
  storage
    .bucket(bucket)
    .file(key)
    .createReadStream()
    .on("error", (err) => res.status(404).send(err.message))
    .pipe(res);
});

app.listen(8080, () => console.log("gcs-proxy listening on 8080"));
