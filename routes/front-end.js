const ejs = require('ejs');
const router = require('express').Router();
const fs = require('fs');

const navbarTemplate = fs.readFileSync(`${__dirname}/../public/navbar.html`, { encoding: 'UTF-8' });
const footerTemplate = fs.readFileSync(`${__dirname}/../public/footer.html`, { encoding: 'UTF-8' });
const homeHtml = fs.readFileSync(`${__dirname}/../public/home.html`, { encoding: 'UTF-8' });
const resetHtml = fs.readFileSync(`${__dirname}/../public/reset.html`, { encoding: 'UTF-8' });
const signupHtml = fs.readFileSync(`${__dirname}/../public/signup.html`, { encoding: 'UTF-8' });
const adminHtml = fs.readFileSync(`${__dirname}/../public/admin.html`, { encoding: 'UTF-8' });
const chatHtml = fs.readFileSync(`${__dirname}/../public/chat.html`, { encoding: 'UTF-8' });
const activateTemplate = fs.readFileSync(`${__dirname}/../public/activate.html`, { encoding: 'UTF-8' });
const unauthorized = fs.readFileSync(`${__dirname}/../public/unauth.html`, { encoding: 'UTF-8' });

router.get("/", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: 'home' });
  const footerHtml = ejs.render(footerTemplate, { scripts: undefined });
  return res.send(navHtml + homeHtml + footerHtml);
});

router.get("/signup", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: undefined });
  const footerHtml = ejs.render(footerTemplate, { scripts: ['/js/signup.js'] });
  return res.send(navHtml + signupHtml + footerHtml);
});

router.get("/reset/:token", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: undefined });
  const footerHtml = ejs.render(footerTemplate, { scripts: ['/js/reset.js'] });
  return res.send(navHtml + resetHtml + footerHtml);
});

router.get("/activate/:token", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: undefined });
  const footerHtml = ejs.render(footerTemplate, { scripts: ['/js/activate.js'] });
  const activateHtml = ejs.render(activateTemplate, { token: req.params.token });
  return res.send(navHtml + activateHtml + footerHtml);
});

router.get("/chat", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: 'profile' });
  const footerHtml = ejs.render(footerTemplate, { scripts: ['https://cdnjs.cloudflare.com/ajax/libs/socket.io/2.3.0/socket.io.js', '/js/chat.js'] });
  const content = user ? chatHtml : unauthorized;
  return res.send(navHtml + content + footerHtml);
});

router.get("/admin", (req, res) => {
  const user = req.session.user;
  const navHtml = ejs.render(navbarTemplate, { user: user, selected: 'profile' });
  const footerHtml = ejs.render(footerTemplate, { scripts: ['/js/reset.js'] });
  const content = (user && user.role === 'ADMIN') ? adminHtml : unauthorized;
  return res.send(navHtml + content + footerHtml);
});

module.exports = router