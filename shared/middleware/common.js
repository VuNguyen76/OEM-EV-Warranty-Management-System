const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const setupCommonMiddleware = (app) => {
    // app.use(express.json()); Tạm xóa có thể gây lỗi
    app.use(helmet());
    app.use(cors());
    app.use(morgan("combined"));
};
module.exports = {
    setupCommonMiddleware
};
