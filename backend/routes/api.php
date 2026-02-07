<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HomeController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ========================================================================
// 1. PUBLIC ROUTES (Ai cũng truy cập được)
// ========================================================================

// --- Auth ---
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// --- Trang chủ & Sản phẩm ---
Route::get('/home', [HomeController::class, 'index']);
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']); // <---   Đã thêm dấu chấm phẩy (;)


// Route cho Giỏ hàng
Route::prefix('cart')->group(function () {
    // Các route này sẽ tự động nhận diện User nếu có Token gửi kèm
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/add', [CartController::class, 'addToCart']);
        Route::put('/update/{id}', [CartController::class, 'updateQuantity']);
        Route::delete('/remove/{id}', [CartController::class, 'remove']);
    });
});


// ========================================================================
// 2. PROTECTED ROUTES (Bắt buộc phải có Token)
// ========================================================================
Route::middleware('auth:sanctum')->group(function () {
    
    // Lấy thông tin User hiện tại (Profile)
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    // Đăng xuất
    Route::post('/logout', [AuthController::class, 'logout']);
    
    // Sau này sẽ thêm các route: Đặt hàng (Checkout), Lịch sử đơn hàng... ở đây
});