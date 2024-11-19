"use strict";

const app = require("./app");
const {PORT} = require("./config");

const startTime = Date.now();

app.listen(PORT, function () {
    const startupDuration = Date.now() - startTime;
    console.log(`Server started in ${startupDuration} ms`);
});