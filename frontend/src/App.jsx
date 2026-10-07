import { RouterProvider } from 'react-router';
import { router } from './routes/router.jsx';

export default function App() {
  return <RouterProvider router={router} />;
}
