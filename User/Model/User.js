const express = require("express");
const mongoose = require("mongoose");
const User = mongoose.model("User");

module.exports = User;