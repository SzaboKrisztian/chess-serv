// Express setup

const express = require('express');
const app = express();
const helmet = require('helmet');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public/static'));
app.use(helmet());
app.set('view engine', 'ejs'); // Set ejs as the templating engine

// Sessions setup

const secret = require('./config/session_secret').secret;
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const sessionStoreOptions = {
  host: 'localhost',
  port: '3306',
  ...require('./config/mysql_cred').credentials
};
const sessionStore = new MySQLStore(sessionStoreOptions);
const sessionMiddleware = session({
  secret: secret,
  store: sessionStore,
  resave: false,
  saveUninitialized: true
});
app.use(sessionMiddleware);

// Rate limiter

const rateLimit = require('express-rate-limit');
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8
});
app.use('/auth/login', limiter);
app.use('/auth/signup', limiter);

// Knex + Objection setup

const Model = require('objection').Model;
const Knex = require('knex');
const knexFile = require('./knexfile');
const knex = Knex(knexFile.development);
Model.knex(knex);

// Routes

const authRoutes = require('./routes/auth');
// const gameRoutes = require('./routes/game');
const frontEndRoutes = require('./routes/front');

app.use(authRoutes);
// app.use(gameRoutes);
app.use(frontEndRoutes);

// Sockets

const server = require('http').createServer(app);
const io = require('socket.io').listen(server);

io.use((socket, next) => {
  sessionMiddleware(socket.request, socket.request.res || {}, next);
});

const sockets = require('./sockets/sockets')(io);

const port = 3000;

server.listen(3310); // The listener for socket connections
app.listen(port, (error) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Listening on port", port);
  }
});