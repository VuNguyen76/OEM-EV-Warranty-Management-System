import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar";
import SideBar from "../components/SideBar";

const DefaultLayout = () => {
  return (
    <div className="h-screen">
      <header>
        <Navbar />
      </header>
      <main className="h-full">
        <div className="h-full flex gap-5 px-4 py-2">
          <SideBar />
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DefaultLayout;
