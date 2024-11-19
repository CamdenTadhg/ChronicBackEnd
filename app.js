"use strict";

/**Express app for Chronic */

const express = require("express");
const cors = require('cors');

const {NotFoundError} = require('./expressError');

const {authenticateJWT} = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const diagnosesRoutes = require('./routes/diagnoses');
const symptomsRoutes = require('./routes/symptoms');
const medsRoutes = require('./routes/meds');
const dataRoutes = require('./routes/dataroute');
const pubmedRoutes = require('./routes/pubmedroute');

const app = express();

app.use(express.json());
app.use(authenticateJWT);
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
var corsOptions = {
  origin: allowedOrigins
}
app.use(cors(corsOptions))

app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/diagnoses', diagnosesRoutes);
app.use('/symptoms', symptomsRoutes);
app.use('/meds', medsRoutes);
app.use('/data', dataRoutes);
app.use('/latest', pubmedRoutes);



/** Handle 404 errors -- this matches everything */
app.use(function (req, res, next) {
    return next(new NotFoundError());
  });
  
  /** Generic error handler; anything unhandled goes here. */
  app.use(function (err, req, res, next) {
    if (process.env.NODE_ENV !== "test") console.error(err.stack);
    const status = err.status || 500;
    const message = err.message;
  
    return res.status(status).json({
      error: { message, status },
    });
  });
  
  module.exports = app;