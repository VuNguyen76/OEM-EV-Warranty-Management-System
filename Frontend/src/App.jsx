import React, { useEffect } from "react";
import { RouterProvider } from "react-router-dom";
import route from "./routes";
import { ToastContainer } from "react-toastify";
import { useDispatch } from "react-redux";
import { setCredentials } from "./features/userSlice/userSlice.slice";

const App = () => {

  return (
    <>
      <ToastContainer />
      <RouterProvider router={route} />
    </>
  );
};

export default App;
