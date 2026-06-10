import { Navigate, Route, Routes } from 'react-router-dom';
import EvalsPage from '../pages/EvalsPage';
import { DEFAULT_ROUTE_PATH, ROUTES } from './routes';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to={DEFAULT_ROUTE_PATH} replace />} />
      {ROUTES.map((route) => (
        <Route key={route.key} path={route.path} element={route.element} />
      ))}
      <Route path="/evals/:taskId" element={<EvalsPage />} />
    </Routes>
  );
}
