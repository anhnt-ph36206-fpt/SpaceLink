<?php

use App\Http\Controllers\Api\Admin\AttributeController;
use App\Http\Controllers\Api\Admin\AttributeGroupController as AdminAttributeGroupController;
use App\Http\Controllers\Api\Admin\SpecGroupController;
use App\Http\Controllers\Api\Admin\ProductSpecificationController;
use App\Http\Controllers\Api\Admin\BannerController as AdminBannerController;
use App\Http\Controllers\Api\Admin\CategoryController as AdminCategoryController;
use App\Http\Controllers\Api\Admin\ContactController as AdminContactController;
use App\Http\Controllers\Api\Admin\CommentController as AdminCommentController;
use App\Http\Controllers\Api\Admin\DashboardController;
use App\Http\Controllers\Api\Admin\NewsController as AdminNewsController;
use App\Http\Controllers\Api\Admin\ReviewController as AdminReviewController;
use App\Http\Controllers\Api\Admin\UserController as AdminUserController;
use App\Http\Controllers\Api\AuthController;
// Client Controllers
use App\Http\Controllers\Api\Client\AddressController;
use App\Http\Controllers\Api\Client\BannerController as ClientBannerController;
use App\Http\Controllers\Api\Client\BrandController;
use App\Http\Controllers\Api\Client\CartController;
use App\Http\Controllers\Api\Client\CategoryController as ClientCategoryController;
use App\Http\Controllers\Api\Client\CheckoutController;
use App\Http\Controllers\Api\Client\CommentController as ClientCommentController;
use App\Http\Controllers\Api\Client\ContactController as ClientContactController;
use App\Http\Controllers\Api\Client\NewsController as ClientNewsController;
use App\Http\Controllers\Api\Client\OrderController as ClientOrderController;
use App\Http\Controllers\Api\Client\ProductController;
use App\Http\Controllers\Api\Client\ProfileController;
use App\Http\Controllers\Api\Client\ReviewController as ClientReviewController;
use App\Http\Controllers\Api\Client\SearchController;
use App\Http\Controllers\Api\Client\ShippingController;
use App\Http\Controllers\Api\Client\ComplaintController as ClientComplaintController;
use App\Http\Controllers\Api\Client\WishlistController as ClientWishlistController;
use App\Http\Controllers\Api\Client\ChatbotController;
use Illuminate\Support\Facades\Route;

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
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// --- Brands ---
Route::get('/brands', [BrandController::class, 'index']);

// --- Banners (public) ---
Route::get('/banners', [ClientBannerController::class, 'index']);

// --- Categories (public) ---
Route::get('/categories', [ClientCategoryController::class, 'index']);
Route::get('/categories/{slug}', [ClientCategoryController::class, 'show']);

// --- Products ---
Route::get('/products', [ProductController::class, 'index']);
Route::get('/products/compare', [ProductController::class, 'compare']);
Route::get('/products/{id}', [ProductController::class, 'show']);

// --- Cart (Legacy) ---
Route::get('/cart', [CartController::class, 'index']);
Route::post('/cart/add', [CartController::class, 'addToCart']);
Route::put('/cart/update/{id}', [CartController::class, 'updateQuantity']);
Route::delete('/cart/remove/{id}', [CartController::class, 'remove']);

// --- Reviews & News (Public) ---
Route::get('/products/{id}/reviews', [ClientReviewController::class, 'productReviews']);
Route::get('/news', [ClientNewsController::class, 'index']);
Route::get('/news/{slug}', [ClientNewsController::class, 'show']);

// --- Comments (Public) ---
Route::get('/products/{id}/comments', [ClientCommentController::class, 'index']);
Route::get('/comments/{comment}', [ClientCommentController::class, 'show']);
Route::get('/comments/{comment}/replies', [ClientCommentController::class, 'replies']);

// --- Contacts (Public) ---
Route::post('/contacts', [ClientContactController::class, 'store']);

// --- Search (Public) ---
Route::middleware('throttle:60,1')->group(function () {
    Route::get('/search', SearchController::class);
    Route::get('/search/autocomplete', [SearchController::class, 'autocomplete']);
});

// --- Chatbot (Public) ---
Route::post('/chat', [ChatbotController::class, 'chat']);

// ========================================================================
// 2. CLIENT ROUTES — /api/client/*
// ========================================================================
Route::prefix('client')->name('client.')->group(function () {

    Route::get('/categories', [ClientCategoryController::class, 'index'])->name('categories.index');
    Route::get('/categories/{slug}', [ClientCategoryController::class, 'show'])->name('categories.show');

    // --- Client Cart (optional auth) ---
    Route::prefix('cart')->group(function () {
        Route::get('/', [CartController::class, 'index']);
        Route::post('/add', [CartController::class, 'addToCart']);
        Route::post('/check-stock', [CartController::class, 'checkStock']);
        Route::put('/update/{cart_item_id}', [CartController::class, 'updateQuantity']);
        Route::delete('/remove/{cart_item_id}', [CartController::class, 'remove']);
        Route::delete('/clear', [CartController::class, 'clear']);
    });

    // --- Checkout & Payment ---
    Route::middleware('auth:sanctum')->group(function () {
        // Voucher (client)
        Route::get('/vouchers/available', [\App\Http\Controllers\Api\Client\VoucherController::class, 'available']);

        Route::post('checkout/vnpay', [CheckoutController::class, 'createVnpayPayment']);
        Route::post('/checkout', [CheckoutController::class, 'checkout']);
        Route::post('/checkout/check-voucher', [CheckoutController::class, 'checkVoucher']);
        Route::post('/checkout/verify-vnpay-payment', [CheckoutController::class, 'verifyVnpayPayment']);

        // Đơn hàng của client
        Route::get('/orders', [ClientOrderController::class, 'index']);
        Route::get('/orders/{id}', [ClientOrderController::class, 'show']);
        Route::post('/orders/{id}/cancel', [ClientOrderController::class, 'cancel']);
        Route::post('/orders/{id}/cancel-vnpay', [ClientOrderController::class, 'cancelUnpaidVnpay']);
        Route::post('/orders/{id}/cancel-request', [\App\Http\Controllers\Api\Client\OrderCancelRequestController::class, 'store']);
        Route::get('/orders/{id}/cancel-request', [\App\Http\Controllers\Api\Client\OrderCancelRequestController::class, 'show']);
        Route::post('/orders/{id}/confirm-received', [ClientOrderController::class, 'confirmReceived']);
        Route::post('/orders/{id}/return-request', [ClientOrderController::class, 'requestReturn']);
        Route::get('/orders/{id}/retry-vnpay', [ClientOrderController::class, 'retryVnpayPayment']);
        Route::post('/orders/{id}/switch-to-cod', [ClientOrderController::class, 'switchToCod']);
        Route::put('/orders/{id}/update-shipping', [ClientOrderController::class, 'updateShipping']);

        // Khiếu nại đơn hàng
        Route::get('/orders/{id}/complaint', [ClientComplaintController::class, 'show']);
        Route::post('/orders/{id}/complaint', [ClientComplaintController::class, 'store']);

        // Review sản phẩm
        Route::post('/reviews', [ClientReviewController::class, 'store']);

        // Comment sản phẩm
        Route::post('/comments', [ClientCommentController::class, 'store'])->middleware('throttle:5,1');
        Route::put('/comments/{comment}', [ClientCommentController::class, 'update']);
        Route::delete('/comments/{comment}', [ClientCommentController::class, 'destroy']);

        // Wishlist
        Route::get('/wishlist', [ClientWishlistController::class, 'index']);
        Route::post('/wishlist', [ClientWishlistController::class, 'store']);
        Route::delete('/wishlist/{id}', [ClientWishlistController::class, 'destroy']);

        // Notifications (client)
        Route::get('/notifications', [\App\Http\Controllers\Api\Client\UserNotificationController::class, 'index']);
        Route::patch('/notifications/read-all', [\App\Http\Controllers\Api\Client\UserNotificationController::class, 'readAll']);
        Route::patch('/notifications/{id}/read', [\App\Http\Controllers\Api\Client\UserNotificationController::class, 'read']);
    });
});

// ========================================================================
// 3. PROTECTED ROUTES (Bắt buộc login)
// ========================================================================
Route::middleware('auth:sanctum')->group(function () {

    Route::prefix('auth')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
        Route::post('/change-password', [AuthController::class, 'changePassword']);
    });

    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);

    Route::apiResource('addresses', AddressController::class);
});

// --- VNPAY Webhooks ---
Route::get('payment/vnpay-return', [\App\Http\Controllers\Api\Client\CheckoutController::class, 'vnpayReturn']);
Route::get('payment/vnpay-ipn', [\App\Http\Controllers\Api\Client\CheckoutController::class, 'vnpayIpn']);

// ========================================================================
// 4. ADMIN ROUTES — /api/admin/*
// ========================================================================

// ── 4a. Staff + Admin: quản lý sản phẩm, đơn hàng, nội dung ─────────────
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'staff'])->group(function () {

    // Category — Staff được SoftDelete (destroy), KHÔNG được forceDelete
    Route::post('categories/{category}/reassign-products', [AdminCategoryController::class, 'reassignProducts']);
    Route::apiResource('categories', AdminCategoryController::class);

    // Brands — Staff được thêm/sửa/toggle, KHÔNG được xóa
    Route::patch('brands/{brand}/toggle', [\App\Http\Controllers\Api\Admin\BrandController::class, 'toggle']);
    Route::apiResource('brands', \App\Http\Controllers\Api\Admin\BrandController::class)->except(['destroy']);

    Route::apiResource('attribute-groups', AdminAttributeGroupController::class);
    Route::apiResource('specification-groups', \App\Http\Controllers\Api\Admin\SpecificationGroupController::class);

    // Product — dùng Policy để phân biệt delete / forceDelete / restore
    Route::post('products/bulk-action', [\App\Http\Controllers\Api\Admin\ProductController::class, 'bulkAction']);
    Route::patch('products/{product}/toggle-active', [\App\Http\Controllers\Api\Admin\ProductController::class, 'toggleActive']);
    // forceDelete & restore — Policy sẽ chặn Staff trong Controller
    Route::delete('products/{product}/force', [\App\Http\Controllers\Api\Admin\ProductController::class, 'forceDelete'])->withTrashed();
    Route::post('products/{product}/restore', [\App\Http\Controllers\Api\Admin\ProductController::class, 'restore'])->withTrashed();
    Route::get('products/{product}/specifications', [\App\Http\Controllers\Api\Admin\ProductController::class, 'getSpecifications']);
    Route::put('products/{product}/specifications', [\App\Http\Controllers\Api\Admin\ProductController::class, 'syncSpecifications']);
    Route::apiResource('products', \App\Http\Controllers\Api\Admin\ProductController::class);

    Route::get('products/{product}/variants', [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'index']);
    Route::post('products/{product}/variants', [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'store']);
    Route::put('products/{product}/variants/{variant}', [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'update']);
    Route::delete('products/{product}/variants/{variant}', [\App\Http\Controllers\Api\Admin\ProductVariantController::class, 'destroy']);

    Route::get('products/{product}/specifications', [ProductSpecificationController::class, 'index']);
    Route::post('products/{product}/specifications', [ProductSpecificationController::class, 'store']);
    Route::put('products/{product}/specifications/bulk', [ProductSpecificationController::class, 'bulk']);
    Route::put('products/{product}/specifications/{specification}', [ProductSpecificationController::class, 'update']);
    Route::delete('products/{product}/specifications/{specification}', [ProductSpecificationController::class, 'destroy']);

    Route::post('products/{product}/images', [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'store']);
    Route::delete('products/{product}/images/{image}', [\App\Http\Controllers\Api\Admin\ProductImageController::class, 'destroy']);

    // Đơn hàng — Staff chỉ cập nhật status, không được sửa total_amount (logic trong Controller/Policy)
    Route::get('orders', [\App\Http\Controllers\Api\Admin\OrderController::class, 'index']);
    Route::get('orders/{order}', [\App\Http\Controllers\Api\Admin\OrderController::class, 'show']);
    Route::patch('orders/{order}/status', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updateStatus']);
    Route::patch('orders/{order}/payment-status', [\App\Http\Controllers\Api\Admin\OrderController::class, 'updatePaymentStatus']);
    Route::post('orders/{order}/return/approve', [\App\Http\Controllers\Api\Admin\OrderController::class, 'approveReturn']);
    Route::post('orders/{order}/return/reject', [\App\Http\Controllers\Api\Admin\OrderController::class, 'rejectReturn']);
    Route::get('orders/{order}/cancel-requests', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'cancelRequests']);
    Route::post('orders/{order}/cancel-requests/{req}/approve', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'approveCancelRequest']);
    Route::post('orders/{order}/cancel-requests/{req}/reject', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'rejectCancelRequest']);

    Route::get('notifications', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'index']);
    Route::patch('notifications/read-all', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'readAll']);
    Route::patch('notifications/{id}/read', [\App\Http\Controllers\Api\Admin\AdminNotificationController::class, 'markRead']);

    // Complaints
    Route::apiResource('complaints', \App\Http\Controllers\Api\Admin\ComplaintController::class)->only(['index', 'show', 'update']);

    // Vouchers — Staff được thêm/sửa, KHÔNG được xóa (destroy ở group admin)
    Route::apiResource('vouchers', \App\Http\Controllers\Api\Admin\VoucherController::class)->except(['destroy']);

    // Reviews — Staff được xem/trả lời/ẩn, KHÔNG được xóa (destroy ở group admin)
    Route::get('reviews', [AdminReviewController::class, 'index']);
    Route::patch('reviews/{id}/reply', [AdminReviewController::class, 'reply']);
    Route::patch('reviews/{id}/toggle-visibility', [AdminReviewController::class, 'toggleVisibility']);

    // Comments — Staff được xem/duyệt/từ chối/ẩn, KHÔNG được xóa
    Route::get('comments', [AdminCommentController::class, 'index']);
    Route::get('comments/{comment}', [AdminCommentController::class, 'show']);
    Route::patch('comments/{comment}/approve', [AdminCommentController::class, 'approve']);
    Route::patch('comments/{comment}/reject', [AdminCommentController::class, 'reject']);
    Route::patch('comments/{comment}/toggle-hide', [AdminCommentController::class, 'toggleHide']);

    // News — Staff được thêm/sửa, KHÔNG được xóa (destroy ở group admin)
    Route::apiResource('news', AdminNewsController::class)->except(['destroy']);

    // Contacts — Staff được xem/trả lời, KHÔNG được xóa
    Route::get('contacts', [AdminContactController::class, 'index']);
    Route::patch('contacts/{id}/reply', [AdminContactController::class, 'reply']);

    Route::apiResource('attributes', AttributeController::class);

    Route::apiResource('banners', AdminBannerController::class);
    Route::patch('banners/{banner}/toggle', [AdminBannerController::class, 'toggle']);

    // Stats cơ bản — Staff được xem
    Route::get('dashboard/stats', [DashboardController::class, 'stats']);
    Route::get('dashboard/low-stock', [DashboardController::class, 'lowStock']);
});

// ── 4b. Admin-only: Quản lý người dùng, báo cáo doanh thu & xóa dữ liệu ──
Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'admin'])->group(function () {

    // Quản lý User/Staff/Admin — CHỈ Admin
    Route::apiResource('users', AdminUserController::class);
    Route::post('users/{user}/restore', [AdminUserController::class, 'restore']);

    // Báo cáo doanh thu cấp cao — CHỈ Admin
    Route::get('dashboard/revenue', [DashboardController::class, 'revenue']);
    Route::get('dashboard/sales-by-category', [DashboardController::class, 'salesByCategory']);
    Route::get('dashboard/top-products', [DashboardController::class, 'topProducts']);
    Route::get('dashboard/orders-stats', [DashboardController::class, 'ordersStats']);
    Route::get('dashboard/customers-stats', [DashboardController::class, 'customersStats']);

    // ── Xóa dữ liệu — CHỈ Admin ──────────────────────────────────────────
    // Category: forceDelete vĩnh viễn
    Route::delete('categories/{category}/force', [AdminCategoryController::class, 'forceDelete']);
    // Brand: xóa thương hiệu
    Route::delete('brands/{brand}', [\App\Http\Controllers\Api\Admin\BrandController::class, 'destroy']);
    // Reviews: xóa vĩnh viễn đánh giá
    Route::delete('reviews/{id}', [AdminReviewController::class, 'destroy']);
    // Comments: xóa vĩnh viễn bình luận
    Route::delete('comments/{comment}', [AdminCommentController::class, 'destroy']);
    // News: xóa bài viết
    Route::delete('news/{news}', [AdminNewsController::class, 'destroy']);
    // Contacts: xóa liên hệ
    Route::delete('contacts/{id}', [AdminContactController::class, 'destroy']);
    // Vouchers: xóa mã giảm giá
    Route::delete('vouchers/{voucher}', [\App\Http\Controllers\Api\Admin\VoucherController::class, 'destroy']);
});