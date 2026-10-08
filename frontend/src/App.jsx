import { RouterProvider } from 'react-router';
import { router } from './routes/router.jsx';
import ErrorBoundary from './components/feedback/ErrorBoundary.jsx';

export default function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
