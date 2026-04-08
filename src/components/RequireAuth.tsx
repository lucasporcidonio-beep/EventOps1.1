import { Navigate } from 'react-router-dom';

export const RequireAuth = ({ children }: { children: JSX.Element }) => {
  const token = localStorage.getItem("app_token");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};
