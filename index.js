const express = require('express');
const { readFileSync } = require('fs');
const app = express();
const accessToken = readFileSync('./token.txt', 'utf8');

app.set('view engine', 'ejs')

app.get("/", (req, res) => {
  res.render('index.ejs', { acessToken: accessToken });
});

app.listen(8080);
