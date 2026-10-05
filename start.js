
const { spawn } = require("child_process");
const path = require("path");

const botlar = [
  { isim: "NSFW-Bot", klasor: "./KrX", dosya: "index.js" },
  { isim: "Mod-Bot", klasor: "./modbot", dosya: "index.js" },
  { isim: "Music-Bot", klasor: "./MusicBot-main", dosya: "index.js" }
];

botlar.forEach(bot => {
  const p = spawn("node", [bot.dosya], {
    cwd: path.resolve(__dirname, bot.klasor),
    shell: true
  });

  p.stdout.on("data", d => process.stdout.write(`[${bot.isim}] ${d}`));
  p.stderr.on("data", d => process.stderr.write(`[${bot.isim}] ${d}`));
});