<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProfileController; // <--- Mới
use App\Http\Controllers\Api\AddressController; // <--- Mới

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


// ========================================================================
// 2. PROTECTED ROUTES (Bắt buộc phải có Token)
// ========================================================================
Route::middleware('auth:sanctum')->group(function () {
    
    // --- Auth & Profile ---
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']); // Lấy info cơ bản

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