<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\AddressController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\Client\CategoryController as ClientCategoryController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
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
Route::prefix('client')->name('client.')->group(function () {

    // --- Client Categories (public) ---
    Route::get('/categories',        [ClientCategoryController::class, 'index'])->name('categories.index'); // GET /api/client/categories
    Route::get('/categories/{slug}', [ClientCategoryController::class, 'show'])->name('categories.show');  // GET /api/client/categories/{slug}

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


// ========================================================================
// 4. ADMIN ROUTES — /api/admin/*
//    Bắt buộc: đăng nhập (auth:sanctum) + role_id = 1 (admin)
// ========================================================================
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'admin'])->group(function () {

    // --- Admin Categories ---
    Route::apiResource('categories', AdminCategoryController::class);
    // GET    /api/admin/categories          -> index
    // POST   /api/admin/categories          -> store
    // GET    /api/admin/categories/{id}     -> show
    // PUT    /api/admin/categories/{id}     -> update
    // DELETE /api/admin/categories/{id}     -> destroy (xóa mềm)

    // --- Admin Products ---
    Route::apiResource('products', \App\Http\Controllers\Api\Admin\ProductController::class);
    // GET    /api/admin/products            -> index  (filter: search/category/brand/is_active/?trashed=true)
    // POST   /api/admin/products            -> store
    // GET    /api/admin/products/{id}       -> show   (kèm variants + images)
    // PUT    /api/admin/products/{id}       -> update
    // DELETE /api/admin/products/{id}       -> destroy (xóa mềm)

    // Khôi phục sản phẩm đã xóa mềm
    Route::post('products/{product}/restore', [\App\Http\Controllers\Api\Admin\ProductController::class, 'restore']);
    // POST /api/admin/products/{id}/restore -> restore

    // --- Admin Product Variants (nested) ---
    Route::post(   'products/{product}/variants',             [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'store']);
    Route::put(    'products/{product}/variants/{variant}',   [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'update']);
    Route::delete( 'products/{product}/variants/{variant}',   [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'destroy']);
    // POST   /api/admin/products/{id}/variants              -> thêm variant
    // PUT    /api/admin/products/{id}/variants/{variantId}  -> sửa variant
    // DELETE /api/admin/products/{id}/variants/{variantId}  -> xóa variant

    // --- Admin Product Images (nested) ---
    Route::post(   'products/{product}/images',           [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'store']);
    Route::delete( 'products/{product}/images/{image}',   [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'destroy']);
    // POST   /api/admin/products/{id}/images             -> thêm ảnh
    // DELETE /api/admin/products/{id}/images/{imageId}   -> xóa ảnh

    // --- Admin Orders ---
    Route::get(   'orders',                          [\App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
    Route::get(   'orders/{order}',                  [\App\Http\Controllers\Api\Admin\OrderController::class, 'show']);
    Route::patch( 'orders/{order}/status',           [\App\Http\Controllers\Api\Admin\OrderController::class, 'updateStatus']);
    Route::patch( 'orders/{order}/payment-status',   [\App\Http\Controllers\Api\Admin\OrderController::class, 'updatePaymentStatus']);
    // GET    /api/admin/orders                          -> index  (filter: search/status/payment_status/date)
    // GET    /api/admin/orders/{id}                     -> show   (kèm items + statusHistory)
    // PATCH  /api/admin/orders/{id}/status              -> cập nhật trạng thái (tự ghi timestamp + log)
    // PATCH  /api/admin/orders/{id}/payment-status      -> cập nhật thanh toán
});