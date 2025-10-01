const express = require("express");
const UserService = require("./Service/UserService");
const { setupCommonMiddleware } = require("../shared/middleware/common");
const app = express();
const port = 3000;

setupCommonMiddleware(app);
app.use("/api/users", UserService);

app.listen(port, () => {
    console.log(`User service running on http://localhost:${port}`);
});