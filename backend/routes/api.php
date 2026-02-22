<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CheckoutController;


/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ========================================================================
// 1. PUBLIC ROUTES (Ai cũng truy cập được)
// ========================================================================

// --- Auth ---
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
});

// --- Categories ---
use App\Http\Controllers\Api\CategoryController;
Route::get('/categories', [CategoryController::class, 'index']);

// --- Brands ---
use App\Http\Controllers\Api\BrandController;
Route::get('/brands', [BrandController::class, 'index']);

// --- Products ---
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// --- Cart (Legacy – giữ để không breaking Swagger cũ) ---
Route::get('/cart', [CartController::class, 'index']);
Route::post('/cart/add', [CartController::class, 'addToCart']);
Route::put('/cart/update/{id}', [CartController::class, 'updateQuantity']);
Route::delete('/cart/remove/{id}', [CartController::class, 'remove']);


// ========================================================================
// 2. CLIENT ROUTES — /api/client/*
//    Cart: hỗ trợ Guest (X-Session-ID) lẫn User đã login
//    Checkout: bắt buộc phải đăng nhập (auth:sanctum)
// ========================================================================
Route::prefix('client')->group(function () {

    // --- Client Cart (optional auth – hỗ trợ Guest + User) ---
    Route::prefix('cart')->group(function () {
        Route::get('/',            [CartController::class, 'index']);           // GET  /api/client/cart
        Route::post('/add',        [CartController::class, 'addToCart']);       // POST /api/client/cart/add
        Route::put('/update/{cart_item_id}',    [CartController::class, 'updateQuantity']); // PUT  /api/client/cart/update/{id}
        Route::delete('/remove/{cart_item_id}', [CartController::class, 'remove']);         // DELETE /api/client/cart/remove/{id}
        Route::delete('/clear',    [CartController::class, 'clear']);           // DELETE /api/client/cart/clear
    });

    // --- Client Checkout (bắt buộc đăng nhập) ---
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/checkout', [CheckoutController::class, 'checkout']);      // POST /api/client/checkout
    });
});


// ========================================================================
// 3. PROTECTED ROUTES (Bắt buộc phải có Token)
// ========================================================================
Route::middleware('auth:sanctum')->group(function () {
    
    // --- Auth & Profile ---
    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']); // Lấy info cơ bản
    });

    // --- Quản lý Hồ sơ (Profile) ---
    Route::get('/profile', [ProfileController::class, 'show']);   // Lấy chi tiết + địa chỉ
    Route::put('/profile', [ProfileController::class, 'update']); // Cập nhật info

    // --- Quản lý Địa chỉ (Address) ---
    Route::apiResource('addresses', AddressController::class);
    // Tự động tạo ra:
    // GET    /api/addresses          -> Danh sách
    // POST   /api/addresses          -> Thêm mới
    // PUT    /api/addresses/{id}     -> Sửa
    // DELETE /api/addresses/{id}     -> Xóa
});