<?php

namespace App\Http\Middleware;

use App\Models\User;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckAdmin
{
    /**
     * Chỉ cho phép user có role_id = 1 (Admin) đi qua.
     * Middleware này hoạt động SAU auth:sanctum — user đã được xác thực.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->role_id !== User::ROLE_ADMIN) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        return $next($request);
    }
}
