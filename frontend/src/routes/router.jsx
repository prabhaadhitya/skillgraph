import { createBrowserRouter } from 'react-router';
import Landing from '../pages/Landing.jsx';
import ComponentKit from '../pages/ComponentKit.jsx';
import SkillGraph from '../pages/SkillGraph.jsx';

const routes = [
  {
    path: '/',
    element: <Landing />,
  },
];

if (import.meta.env.DEV) {
  routes.push(
    {
      path: '/_kit',
      element: <ComponentKit />,
    },
    {
      path: '/_graph',
      element: <SkillGraph />,
    },
  );
}

export const router = createBrowserRouter(routes);
export default router;
