import React, {useState} from 'react';
import {Link, useLocation} from 'react-router-dom';

const Navbar: React.FC = () => {
    const location = useLocation();
    const [showCategories, setShowCategories] = useState(false);

    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    const categories = [
        {name: 'Accessories', count: 3},
        {name: 'Electronics & Computer', count: 5},
        {name: 'Laptops & Desktops', count: 2},
        {name: 'Mobiles & Tablets', count: 8},
        {name: 'SmartPhone & Smart TV', count: 5},
    ];

    return (
        <div className="container-fluid nav-bar p-0">
            <div className="row gx-0 bg-primary px-5 align-items-center">
                <div className="col-lg-3 d-none d-lg-block">
                    <nav className="navbar navbar-light position-relative" style={{width: '250px'}}>
                        <button
                            className="navbar-toggler border-0 fs-4 w-100 px-0 text-start"
                            type="button"
                            onClick={() => setShowCategories(!showCategories)}
                        >
                            <h4 className="m-0">
                                <i className="fa fa-bars me-2"></i>All Categories
                            </h4>
                        </button>
                        <div className={`collapse navbar-collapse rounded-bottom ${showCategories ? 'show' : ''}`}
                             id="allCat">
                            <div className="navbar-nav ms-auto py-0">
                                <ul className="list-unstyled categories-bars">
                                    {categories.map((category, index) => (
                                        <li key={index}>
                                            <div className="categories-bars-item">
                                                <a href="#">{category.name}</a>
                                                <span>({category.count})</span>
                                            </div>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </nav>
                </div>
                <div className="col-12 col-lg-9">
                    <nav className="navbar navbar-expand-lg navbar-light bg-primary">
                        <Link to="/" className="navbar-brand d-block d-lg-none">
                            <h1 className="display-5 text-secondary m-0">
                                <i className="fas fa-shopping-bag text-white me-2"></i>Electro
                            </h1>
                        </Link>
                        <button
                            className="navbar-toggler ms-auto"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarCollapse"
                        >
                            <span className="fa fa-bars fa-1x"></span>
                        </button>
                        <div className="collapse navbar-collapse" id="navbarCollapse">
                            <div className="navbar-nav ms-auto py-0">
                                <Link to="/" className={`nav-item nav-link ${isActive('/')}`}>
                                    Home
                                </Link>
                                <Link to="/shop" className={`nav-item nav-link ${isActive('/shop')}`}>
                                    Shop
                                </Link>
                                <Link to="/product/1" className={`nav-item nav-link ${isActive('/product/1')}`}>
                                    Single Page
                                </Link>
                                <div className="nav-item dropdown">
                                    <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                        Pages
                                    </a>
                                    <div className="dropdown-menu m-0">
                                        <Link to="/bestseller" className="dropdown-item">Bestseller</Link>
                                        <Link to="/cart" className="dropdown-item">Cart Page</Link>
                                        <Link to="/checkout" className="dropdown-item">Checkout</Link>
                                        <Link to="/404" className="dropdown-item">404 Page</Link>
                                    </div>
                                </div>
                                <Link to="/contact" className={`nav-item nav-link me-2 ${isActive('/contact')}`}>
                                    Contact
                                </Link>

                                {/* Mobile Category Menu */}
                                <div className="nav-item dropdown d-block d-lg-none mb-3">
                                    <a href="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown">
                                        All Category
                                    </a>
                                    <div className="dropdown-menu m-0">
                                        <ul className="list-unstyled categories-bars">
                                            {categories.map((category, index) => (
                                                <li key={index}>
                                                    <div className="categories-bars-item">
                                                        <a href="#">{category.name}</a>
                                                        <span>({category.count})</span>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <a href="#"
                               className="btn btn-secondary rounded-pill py-2 px-4 px-lg-3 mb-3 mb-md-3 mb-lg-0">
                                <i className="fa fa-mobile-alt me-2"></i> +0123 456 7890
                            </a>
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Navbar;