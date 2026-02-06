import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage: React.FC = () => {
    return (
        <div className="container-fluid py-5">
            <div className="container text-center py-5">
                <div className="row justify-content-center">
                    <div className="col-lg-6">
                        <h1 className="display-1 text-primary">404</h1>
                        <h2 className="mb-4">Page Not Found</h2>
                        <p className="mb-4">
                            We're sorry, the page you have looked for does not exist in our website!
                            Maybe go to our home page or try to use a search?
                        </p>
                        <Link to="/" className="btn btn-primary rounded-pill py-3 px-5">
                            Go Back To Home
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotFoundPage;
