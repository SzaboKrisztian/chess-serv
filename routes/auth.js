// Model
const User = require('../models/User');
const Role = require('../models/Role');
const Token = require('../models/Token');
// UUID for tokens
const uuid = require('uuid');
// Nodemailer
const nodemailer = require('nodemailer');
const transportSettings = require('../config/smtp_settings');
const transporter = nodemailer.createTransport(transportSettings.settings);
// BCrypt for password hashing
const bcrypt = require('bcrypt');
const saltRounds = 12;
const emailPattern = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/
// Hostname for putting in the emails
const hostname = require('../config/hostname').host;

function isPasswordValid(password, passwordRepeat) {
  return (password !== undefined) && (password === passwordRepeat) && (password.length >= 8);
}

function isUsernameValid(username) {
  return /^[0-9a-zA-Z]{4,}$/.test(username);
}

const router = require('express').Router();
router.post("/auth/login", async (req, res) => {
  const body = req.body;

  if (body.username && body.password) {
    try {
      const userQuery = await User.query().where({ username: body.username }).withGraphFetched('role');

      if (userQuery.length > 0) {
        const user = userQuery[0];
        
        if (user.active === 1) {
          bcrypt.compare(body.password, user.password, (error, result) => {
            if (result) {
              req.session.user = {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role.role
              };
              req.session.timestamp = new Date(); 
              return res.send({ response: "Login successful." });
            } else {
              return res.status(400).send({ response: "Login failed." });
            }
          }); 
        } else {
          return res.status(400).send({ response: "User has not been activated yet. Check your email for activation instructions."});
        }
      } else {
        return res.status(400).send({ response: "User does not exist." });
      }
    } catch (error) {
      return res.status(500).send({ response: "Error: Something went wrong with the database. " + error });
    }
  } else {
    return res.status(400).send({ response: "Error: Must provide username and password." });
  }
});

router.post("/auth/signup", async (req, res) => {
  const { username, email, password, passwordRepeat } = req.body;
  const passwordIsValid = isPasswordValid(password, passwordRepeat);
  const emailIsValid = email && emailPattern.test(email);
  const usernameIsValid = isUsernameValid(username);

  if (usernameIsValid && emailIsValid && passwordIsValid) {
    try {
      const foundUsernames = await User.query().where({ username: username });
      const foundEmails = await User.query().where({ email: email });
      if (foundUsernames.length === 0 && foundEmails.length === 0) {
        const userRole = await Role.query().where({ role: "USER" });
        const userRoleId = userRole[0].id;
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const inserted = await User.query().insert({
          username: username,
          email: email,
          password: hashedPassword,
          role_id: userRoleId
        });
        const token = uuid.v4();
        await Token.query().insert({
          user_id: inserted.id,
          token: token
        });
        transporter.sendMail({
          to: inserted.email,
          subject: "Account activation required",
          text: `The account "${inserted.username}" has just been registered on this email address. If this wasn't you, nothing needs to be done.\n\nIf it indeed was you, then you can activate your account by visiting:\n\n${hostname}/activate/${token}`,
          html: `<p>The account <b>${inserted.username}</b>  has just been registered on this email address. If this wasn't you, nothing needs to be done.</p><h3>${token}</h3><p>If it indeed was you, then you can activate your account by visiting:</p><p><a href="${hostname}/activate/${token}">Activate account</a></p>`
        });
                
        return res.send({ response: `User "${username}" successfully created. Check your email for activation instructions.` });
      } else if (foundUsernames !== 0) {
        return res.status(400).send({ response: "Error: Username already exists." }); 
      } else {
        return res.status(400).send({ response: "Error: Email address already registered." }); 
      }
    } catch (error) {
      return res.status(500).send({ response: "Error: Something went wrong with the database. " + error });
    }
  } else if (password.length < 8) {
    return res.status(400).send({ response: "Error: Password does not fulfill the requirements." });
  } else if (!usernameIsValid) {
    return res.status(400).send({ response: "Error: Username must consist of 4 or more exclusively alphanumerical characters." });
  } else if (!username || !password || !passwordRepeat) {
    return res.status(400).send({ response: "Error: Missing username, password, or passwordRepeat." });
  } else if (password !== passwordRepeat) {
    return res.status(400).send({ response: "Error: password and passwordRepeat do not match." });
  } else {
    return res.status(400).send({ response: "Error: does this ever happen?" });
  }  
});

router.get("/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.send({ response: "You need to be logged in first." });
    } else {
      return res.send({ response: "You have been successfully logged out." });
    }
  });
});

router.get("/auth/activate/:token", async (req, res) => {
  const urlToken = req.params.token;
  try {
    if (urlToken) {
      const tokens = await Token.query().where({ token: urlToken }).withGraphFetched('user');
      if (tokens.length !== 0 && tokens[0].used === 0) {
        const token = tokens[0];
        if (token.user.active === 0) {
          await User.query().findById(token.user.id).patch({
            active: 1
          });
          await Token.query().findById(token.id).patch({
            used: 1
          });
          return res.send({ response: "User successfully activated." });
        } else {
          return res.status(400).send({ response: "User has already been activated." });
        }
      } else {
        return res.status(400).send({ response: "Error: Invalid token."});
      }
      
    } else {
      return res.status(400).send({ response: "Error: Must provide a token." });
    }
  } catch (error) {
    return res.status(500).send({ response: "Error: Something went wrong with the database. " + error });
  }
});

router.post("/auth/req_reset", async (req, res) => {
  const body = req.body;
  if (body.email || body.username) {
    let userQuery, message;
    if (body.email) {
      userQuery = await User.query().where({ email: body.email });
      message = `Password change requested for user "${body.username}". Check your email for further instructions.`;
    } else {
      userQuery = await User.query().where({ username: body.username });
      message = `Password change requested for user with the email address "${body.username}". Check your email for further instructions.`;
    }
    if (userQuery.length > 0) {
      const user = userQuery[0];
      const token = uuid.v4();
      await Token.query().insert({
        user_id: user.id,
        token: token
      });
      transporter.sendMail({
        to: user.email,
        subject: "Password reset requested",
        text: `A password request was requested for the account "${user.username}" registered on this email address. If this wasn't you, nothing needs to be done. The reset token is:\n\n${token}\n\nYou can reset your password by visiting the following link:\n\n${hostname}/reset/${token}`,
        html: `<p>A password request was requested for the account <b>${user.username}</b> registered on this email address. If this wasn't you, nothing needs to be done. The reset token is:</p><h3>${token}</h3><p>You can reset your password by visiting the following link:</p><p><a href="${hostname}/reset/${token}">Reset password</a></p>`
      });
      return res.send({ response: message });
    } else {
      return res.status(400).send({ response: "Error: No such user exists." });
    }
  } else {
    return res.send("You must provide the email or username.")
  }
});

router.post("/auth/do_reset", async (req, res) => {
  const body = req.body;
  try {
    if (body.token) {
      const tokens = await Token.query().where({ token: body.token });
      if (tokens.length !== 0 && tokens[0].used === 0) {
        const token = tokens[0];
        if (isPasswordValid(body.password, body.passwordRepeat)) {
          const hashedPassword = await bcrypt.hash(body.password, saltRounds);
          await User.query().findById(token.userId).patch({
            password: hashedPassword
          });
          await Token.query().findById(token.id).patch({
            used: 1
          });
          return res.send({ response: "Password successfully reset."});
        } else {
          res.status(400).send({ response: "Error changing password: password and passwordRepeat must match, and be at least 8 characters long."});
        }
      } else {
        return res.status(400).send({ response: "Error: Invalid token."});
      }
      
    } else {
      return res.status(400).send({ response: "Error: Must provide a token." });
    }
  } catch (error) {
    return res.status(500).send({ response: "Error: Something went wrong with the database. " + error });
  }
});

router.get("/auth/test", (req, res) => {
  if (req.session.user) {
    res.send({ response: "Authenticated" });
  } else {
    res.status(400).send({ response: "Not authenticated" });
  }
});

module.exports = router;