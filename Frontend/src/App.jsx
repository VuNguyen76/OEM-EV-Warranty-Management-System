import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import route from "./routes";
import { ToastContainer } from "react-toastify";
const App = () => {
  return (
    <>
      <ToastContainer position="bottom-right" />
      <RouterProvider router={route} />
    </>
  );
};

export default App;
