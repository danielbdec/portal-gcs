import https from "https";
import fs from "fs";
import next from "next";

const app = next({ dev: true });
const handle = app.getRequestHandler();

const options = {
  key: fs.readFileSync("G:/certificados/portal.gcsagro.com.br/portal.gcsagro.com.br-key.pem"),
  cert: fs.readFileSync("G:/certificados/portal.gcsagro.com.br/portal.gcsagro.com.br-fullchain.pem"),
};

app.prepare().then(() => {
  https.createServer(options, (req, res) => {
    handle(req, res);
  }).listen(3006, "0.0.0.0", () => {
    console.log("✅ Rodando em: https://portal.gcsagro.com.br:3006");
  });
});
