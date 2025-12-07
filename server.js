import https from "https";
import fs from "fs";
import next from "next";

// Força modo produção dentro do processo
process.env.NODE_ENV = "production";

// Como este server é só pra produção, mantemos dev fixo em false
const dev = false;
const app = next({ dev });
const handle = app.getRequestHandler();

const options = {
  key: fs.readFileSync("G:/certificados/portal.gcsagro.com.br/portal.gcsagro.com.br-key.pem"),
  cert: fs.readFileSync("G:/certificados/portal.gcsagro.com.br/portal.gcsagro.com.br-fullchain.pem"),
};

app
  .prepare()
  .then(() => {
    https
      .createServer(options, (req, res) => {
        handle(req, res);
      })
      .listen(3006, "0.0.0.0", () => {
        console.log("✅ Rodando em: https://portal.gcsagro.com.br:3006");
        console.log("NODE_ENV =", process.env.NODE_ENV);
        console.log("dev =", dev);
      });
  })
  .catch((err) => {
    console.error("Falha ao iniciar o Next/HTTPS:", err);
    process.exit(1);
  });
