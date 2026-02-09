<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    title: "SpaceLink API Documents",
    version: "1.0.0",
    description: "Hệ thống API backend viết bằng Laravel 12"
)]
#[OA\Server(
    url: "http://localhost:8000",
    description: "Local Server"
)]
// --- THÊM ĐOẠN NÀY ĐỂ HIỆN Ổ KHÓA ---
#[OA\SecurityScheme(
    securityScheme: "sanctum",
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Nhập Token theo định dạng: Bearer {token}"
)]
// ------------------------------------
abstract class Controller
{
    //
}