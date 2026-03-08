<?php

return [
    'vnp_TmnCode' => env('VNPAY_TMN_CODE', ''),
    'vnp_HashSecret' => env('VNPAY_HASH_SECRET', ''),
    'vnp_Url' => env('VNPAY_URL', 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html'),
    'vnp_Returnurl' => env('VNPAY_RETURN_URL', 'http://localhost:5173/payment-return'),
    'vnp_apiUrl' => "http://sandbox.vnpayment.vn/merchant_webapi/merchant.html",
    'apiUrl' => "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction",
];
