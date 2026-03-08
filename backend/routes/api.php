<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Auth (dùng chung, không phải Client/Admin)
use App\Http\Controllers\Api\AuthController;

// Client Controllers
use App\Http\Controllers\Api\Client\ProfileController;
use App\Http\Controllers\Api\Client\AddressController;
use App\Http\Controllers\Api\Client\ProductController;
use App\Http\Controllers\Api\Client\CartController;
use App\Http\Controllers\Api\Client\CategoryController as ClientCategoryController;
use App\Http\Controllers\Api\Client\CheckoutController;
use App\Http\Controllers\Api\Client\BrandController;

// Admin Controllers
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;

// New Controllers
use App\Http\Controllers\Api\Client\OrderController as ClientOrderController;
use App\Http\Controllers\Api\Client\ReviewController as ClientReviewController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Client\WishlistController as ClientWishlistController;
use App\Http\Controllers\Api\Client\NewsController as ClientNewsController;
use App\Http\Controllers\Api\Admin\NewsController as AdminNewsController;
use App\Http\Controllers\Api\Client\ContactController as ClientContactController;
use App\Http\Controllers\Api\Admin\ContactController as AdminContactController;
use App\Http\Controllers\Api\Admin\AttributeGroupController;
use App\Http\Controllers\Api\Admin\AttributeController;
use App\Http\Controllers\Api\Admin\DashboardController;



/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// ========================================================================
// 1. PUBLIC ROUTES (Ai cũng truy cập được)
// ========================================================================

// --- Auth (không cần login) ---
Route::prefix('auth')->group(function () {
    Route::post('/register',        [AuthController::class, 'register']);
    Route::post('/login',           [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']); // Gửi email reset
    Route::post('/reset-password',  [AuthController::class, 'resetPassword']);  // Đặt lại mật khẩu
});

// --- Brands ---
Route::get('/brands', [BrandController::class, 'index']);

// --- Categories (public) ---
Route::get('/categories', [ClientCategoryController::class, 'index']);
Route::get('/categories/{slug}', [ClientCategoryController::class, 'show']);

// --- Products ---
Route::get('/products',      [ProductController::class, 'index']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// --- Cart (Legacy – giữ để không breaking Swagger cũ) ---
Route::get('/cart',                  [CartController::class, 'index']);
Route::post('/cart/add',             [CartController::class, 'addToCart']);
Route::put('/cart/update/{id}',      [CartController::class, 'updateQuantity']);
Route::delete('/cart/remove/{id}',   [CartController::class, 'remove']);

// --- Reviews & News (Public) ---
Route::get('/products/{id}/reviews', [ClientReviewController::class, 'productReviews']);
Route::get('/news',                  [ClientNewsController::class, 'index']);
Route::get('/news/{slug}',           [ClientNewsController::class, 'show']);

// --- Contacts (Public) ---
Route::post('/contacts',             [ClientContactController::class, 'store']);


// ========================================================================
// 2. CLIENT ROUTES — /api/client/*
//    Cart: hỗ trợ Guest (X-Session-ID) lẫn User đã login
//    Checkout & Orders: bắt buộc phải đăng nhập (auth:sanctum)
// ========================================================================
Route::prefix('client')->name('client.')->group(function () {

    // --- Client Categories (public) ---
    Route::get('/categories',        [ClientCategoryController::class, 'index'])->name('categories.index'); // GET /api/client/categories
    Route::get('/categories/{slug}', [ClientCategoryController::class, 'show'])->name('categories.show');  // GET /api/client/categories/{slug}

    // --- Client Cart (optional auth – hỗ trợ Guest + User) ---
    Route::prefix('cart')->group(function () {
        Route::get('/',                          [CartController::class, 'index']);
        Route::post('/add',                      [CartController::class, 'addToCart']);
        Route::put('/update/{cart_item_id}',     [CartController::class, 'updateQuantity']);
        Route::delete('/remove/{cart_item_id}',  [CartController::class, 'remove']);
        Route::delete('/clear',                  [CartController::class, 'clear']);
    });

    // --- Bắt buộc đăng nhập từ đây trở xuống ---
    Route::middleware('auth:sanctum')->group(function () {

        // Checkout
        Route::post('/checkout', [CheckoutController::class, 'checkout']);

        // Merge giỏ hàng guest → user sau khi login
        Route::post('/cart/merge', [CartController::class, 'merge']);

        // Đơn hàng của client
        Route::get('/orders',              [ClientOrderController::class, 'index']);
        Route::get('/orders/{id}',         [ClientOrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [ClientOrderController::class, 'cancel']);

        // Review sản phẩm
        Route::post('/reviews',            [ClientReviewController::class, 'store']);

        // Wishlist (Yêu thích)
        Route::get('/wishlist',            [ClientWishlistController::class, 'index']);
        Route::post('/wishlist',           [ClientWishlistController::class, 'store']);
        Route::delete('/wishlist/{id}',    [ClientWishlistController::class, 'destroy']);
    });
});


// ========================================================================
// 3. PROTECTED ROUTES (Bắt buộc phải có Token)
// ========================================================================
Route::middleware('auth:sanctum')->group(function () {

    // --- Auth & Profile ---
    Route::prefix('auth')->group(function () {
        Route::post('/logout',          [AuthController::class, 'logout']);
        Route::get('/me',               [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']); // Đổi mật khẩu khi đã login
    });

    // --- Quản lý Hồ sơ (Profile) ---
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    // --- Quản lý Địa chỉ (Address) ---
    Route::apiResource('addresses', AddressController::class);
});


// ========================================================================
// 4. ADMIN ROUTES — /api/admin/*
//    Bắt buộc: đăng nhập (auth:sanctum) + role_id = 1 (admin)
// ========================================================================
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'admin'])->group(function () {

    // --- Admin Categories ---
    Route::apiResource('categories', AdminCategoryController::class);

    // --- Admin Products ---
    Route::apiResource('products', \App\Http\Controllers\Api\Admin\ProductController::class);
    Route::post('products/{product}/restore', [\App\Http\Controllers\Api\Admin\ProductController::class, 'restore']);

    // --- Admin Product Variants (nested) ---
    Route::get(    'products/{product}/variants',             [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'index']);
    Route::post(   'products/{product}/variants',             [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'store']);
    Route::put(    'products/{product}/variants/{variant}',   [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'update']);
    Route::delete( 'products/{product}/variants/{variant}',   [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'destroy']);

    // --- Admin Product Images (nested) ---
    Route::post(   'products/{product}/images',              [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'store']);
    Route::delete( 'products/{product}/images/{image}',      [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'destroy']);

    // --- Admin Orders ---
    Route::get(   'orders',                        [\App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
    Route::get(   'orders/{order}',                [\App\Http\Controllers\Api\Admin\OrderController::class, 'show']);
    Route::patch( 'orders/{order}/status',         [\App\Http\Controllers\Api\Admin\OrderController::class, 'updateStatus']);
    Route::patch( 'orders/{order}/payment-status', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updatePaymentStatus']);

    // --- Admin Vouchers ---
    Route::apiResource('vouchers', \App\Http\Controllers\Api\Admin\VoucherController::class);

    // --- Admin Users ---
    Route::apiResource('users', AdminUserController::class)->except(['store']);
    Route::post('users/{user}/restore', [AdminUserController::class, 'restore']);

    // --- Admin Reviews ---
    Route::get('reviews',                         [AdminReviewController::class, 'index']);
    // Dùng patch vì update từng phần
    Route::patch('reviews/{id}/reply',            [AdminReviewController::class, 'reply']);
    Route::patch('reviews/{id}/toggle-visibility', [AdminReviewController::class, 'toggleVisibility']);
    Route::delete('reviews/{id}',                 [AdminReviewController::class, 'destroy']);

    // --- Admin News ---
    Route::apiResource('news', AdminNewsController::class);

    // --- Admin Contacts ---
    Route::get('contacts',               [AdminContactController::class, 'index']);
    Route::patch('contacts/{id}/reply',  [AdminContactController::class, 'reply']);
    Route::delete('contacts/{id}',       [AdminContactController::class, 'destroy']);

    // --- Admin Attributes ---
    Route::apiResource('attribute-groups', AttributeGroupController::class);
    Route::apiResource('attributes',       AttributeController::class);

    // --- Admin Dashboard ---
    Route::get('dashboard/stats',   [DashboardController::class, 'stats']);
    Route::get('dashboard/revenue', [DashboardController::class, 'revenue']);
});
