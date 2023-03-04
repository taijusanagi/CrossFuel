import React from 'react';
import { Link } from 'gatsby';

const NotFoundPage: React.FC = () => (
  <main>
    <h1>404: Page not found</h1>
    <p>The page you are looking for could not be found.</p>
    <Link to="/">Go back to the homepage</Link>
  </main>
);

export default NotFoundPage;
