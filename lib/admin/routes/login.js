const { generateUrl } = require('../../shared');

async function loginGet(req, res) {
  res.render('admin/login.ejs', { url: generateUrl(req.baseUrl), messages: req.flash('error') });
};

async function loginPost(req, res) {
  res.redirect(`${req.baseUrl}/crawls`);  
}

module.exports = { loginGet, loginPost };