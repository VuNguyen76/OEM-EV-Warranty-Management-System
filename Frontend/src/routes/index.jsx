import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import Layout from '../components/Layout';
import SelectRole from '../page/auth/SelectRole';
import WarrantyCenterLogin from '../page/auth/WarrantyCenterLogin';
import ManufacturerLogin from '../page/auth/ManufacturerLogin';
import WarrantyCenterDashboard from '../page/warranty-center/Dashboard';
import ManufacturerDashboard from '../page/manufacturer/Dashboard';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <SelectRole />
      },
      {
        path: 'auth',
        children: [
          {
            path: 'warranty-center',
            element: <WarrantyCenterLogin />
          },
          {
            path: 'manufacturer',
            element: <ManufacturerLogin />
          }
        ]
      },
      {
        path: 'warranty-center',
        children: [
          {
            index: true,
            element: <WarrantyCenterDashboard />
          }
        ]
      },
      {
        path: 'manufacturer',
        children: [
          {
            index: true,
            element: <ManufacturerDashboard />
          }
        ]
      }
    ]
  }
]);

export default router;
