const { generateUrl } = require('../../shared');

async function changePasswordGet(req, res) {
  // Unpack variables
  const baseUrl = req.baseUrl;

  res.render('admin/change_password.ejs', { 
    url: generateUrl(baseUrl),
    errors: {},
    values: {}
  });
};

async function changePasswordPost(req, res) {
  // Unpack variables
  const baseUrl = req.baseUrl;
  const user = req.user;
  const currentPassword = req.body.current_password || '';
  const password = req.body.password || '';
  const confirmPassword = req.body.confirm_password || '' ;

  // Update the password
  const errors = await req.models.user.changePassword(user._id, currentPassword, password, confirmPassword);

  // Render the change password view
  res.render('admin/change_password.ejs', { 
    user: user, 
    url: generateUrl(baseUrl),
    errors: errors,
    success: Object.keys(errors).length == 0,
    values: {}
  });
}

module.exports = { changePasswordGet, changePasswordPost };