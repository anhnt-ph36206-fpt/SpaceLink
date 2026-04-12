<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckStaff
{
    /**
     * Cho phép user có role_id = 1 (Admin) HOẶC role_id = 2 (Staff) đi qua.
     * Middleware hoạt động SAU auth:sanctum — user đã được xác thực.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $roleId = $request->user()?->role_id;

        if (!in_array($roleId, [User::ROLE_ADMIN, User::ROLE_STAFF], true)) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không có quyền truy cập khu vực quản trị.',
            ], 403);
        }

        return $next($request);
    }
}
