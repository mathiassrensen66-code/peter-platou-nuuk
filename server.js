const http = require("http");
const { ensureAdmin, handle } = require("./lib/handle");

const PORT = Number(process.env.PORT) || 4321;
const createdPassword = ensureAdmin();

http.createServer((req, res) => {
  handle(req, res);
}).listen(PORT, () => {
  console.log(`Siden kører på http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin`);
  if (createdPassword) {
    console.log("Admin-bruger oprettet. Brugernavn: admin");
    console.log(`Adgangskode: ${createdPassword}`);
  }
});
