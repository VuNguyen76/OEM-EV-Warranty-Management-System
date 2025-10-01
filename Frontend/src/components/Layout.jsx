import React from 'react';
import { Outlet } from 'react-router-dom';

const Layout = () => {
  return (
    <div className="min-h-screen">
      <Outlet />
    </div>
  );
};

export default Layout;
