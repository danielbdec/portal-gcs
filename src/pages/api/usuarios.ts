import { NextApiRequest, NextApiResponse } from "next";
import fs from "fs";
import path from "path";

const filePath = path.join(process.cwd(), "usuarios.json");

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    try {
      const data = fs.readFileSync(filePath, "utf-8");
      const json = JSON.parse(data);
      return res.status(200).json(json);
    } catch (err) {
      return res.status(500).json({ error: "Erro ao ler o arquivo de usuários." });
    }
  }

  if (req.method === "POST") {
    try {
      const { email, perfil, status } = req.body;
      const data = fs.readFileSync(filePath, "utf-8");
      const usuarios = JSON.parse(data);

      const existente = usuarios.find((u: any) => u.email === email);
      if (existente) {
        Object.assign(existente, { perfil, status });
      } else {
        usuarios.push({ email, perfil, status });
      }

      fs.writeFileSync(filePath, JSON.stringify(usuarios, null, 2));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao salvar usuário." });
    }
  }

  if (req.method === "DELETE") {
    try {
      const { email } = req.body;
      const data = fs.readFileSync(filePath, "utf-8");
      const usuarios = JSON.parse(data);
      const atualizados = usuarios.filter((u: any) => u.email !== email);

      fs.writeFileSync(filePath, JSON.stringify(atualizados, null, 2));
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao excluir usuário." });
    }
  }

  return res.status(405).json({ error: "Método não permitido." });
}
