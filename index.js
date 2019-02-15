const express = require('express');
const app = express();

app.set('view engine', 'ejs')

app.get("/", (req, res) => {
  res.render('index.ejs', { acessToken: "pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw" });
});

app.listen(8080);
