const router = require('express').Router();

router.get("/", (req, res) => {
  const user = req.session.user;
  return res.render('index', { user: user });
});

router.get("/signup", (req, res) => {
  const user = req.session.user;
  return res.render('signup', { user: user });
});

router.get("/reset/:token", (req, res) => {
  const user = req.session.user;
  return res.render('reset', { user: user });
});

router.get("/activate/:token", (req, res) => {
  const user = req.session.user;
  return res.render('activate', { user: user });
});

module.exports = router