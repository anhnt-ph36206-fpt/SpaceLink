import React from 'react';

const ContactPage: React.FC = () => {
    return (
        <div className="container-fluid py-5">
            <div className="container">
                <div className="text-center mb-5">
                    <h1 className="display-4">Contact Us</h1>
                    <p className="text-muted">Get in touch with us</p>
                </div>

                <div className="row g-4 mb-5">
                    <div className="col-md-4">
                        <div className="border rounded p-4 text-center h-100">
                            <i className="fas fa-map-marker-alt fa-3x text-primary mb-3"></i>
                            <h5>Address</h5>
                            <p className="mb-0">123 Street, New York, USA</p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="border rounded p-4 text-center h-100">
                            <i className="fas fa-phone fa-3x text-primary mb-3"></i>
                            <h5>Phone</h5>
                            <p className="mb-0">+012 345 6789</p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="border rounded p-4 text-center h-100">
                            <i className="fas fa-envelope fa-3x text-primary mb-3"></i>
                            <h5>Email</h5>
                            <p className="mb-0">info@example.com</p>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-lg-6 mb-4 mb-lg-0">
                        <div className="border rounded p-4">
                            <h4 className="mb-4">Send Us a Message</h4>
                            <form>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Your Name"
                                            required
                                        />
                                    </div>
                                    <div className="col-md-6">
                                        <input
                                            type="email"
                                            className="form-control"
                                            placeholder="Your Email"
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Subject"
                                            required
                                        />
                                    </div>
                                    <div className="col-12">
                                        <textarea
                                            className="form-control"
                                            rows={6}
                                            placeholder="Your Message"
                                            required
                                        ></textarea>
                                    </div>
                                    <div className="col-12">
                                        <button type="submit" className="btn btn-primary rounded-pill py-3 px-5">
                                            Send Message
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="border rounded p-4 h-100">
                            <h4 className="mb-4">Store Location</h4>
                            <div className="ratio ratio-4x3">
                                <iframe
                                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.4967319468634!2d105.78253631476271!3d21.01379948600888!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab4cd0c66f05%3A0xea31563511af2e54!2zSMOgIE7hu5lpLCBWaeG7h3QgTmFt!5e0!3m2!1svi!2s!4v1234567890123"
                                    style={{ border: 0 }}
                                    allowFullScreen
                                    loading="lazy"
                                ></iframe>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
