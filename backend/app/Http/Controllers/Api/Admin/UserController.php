<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    // =========================================================================
    // GET /api/admin/users — Danh sách người dùng (filter + paginate)
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection
    {
        $showTrashed = filter_var($request->get('trashed', false), FILTER_VALIDATE_BOOLEAN);

        $query = $showTrashed
            ? User::onlyTrashed()
            : User::withTrashed(false);

        $query->with('role')->latest();

        if ($request->filled('search')) {
            $kw = $request->search;
            $query->where(function ($q) use ($kw) {
                $q->where('fullname', 'like', "%{$kw}%")
                  ->orWhere('email',    'like', "%{$kw}%")
                  ->orWhere('phone',    'like', "%{$kw}%");
            });
        }

        if ($request->filled('role_id')) {
            $query->where('role_id', $request->role_id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $perPage = min((int) $request->get('per_page', 15), 100);

        return UserResource::collection($query->paginate($perPage));
    }

    // =========================================================================
    // GET /api/admin/users/{id} — Chi tiết người dùng
    // =========================================================================
    public function show(string $id): JsonResponse
    {
        $user = User::withTrashed()
            ->with(['role', 'addresses'])
            ->withCount('orders')
            ->findOrFail($id);

        return response()->json([
            'status' => true,
            'data'   => array_merge((new UserResource($user))->toArray(request()), [
                'role_id'      => $user->role_id,
                'role_name'    => $user->role?->name,
                'gender'       => $user->gender,
                'date_of_birth'=> $user->date_of_birth?->format('d-m-Y'),
                'last_login_at'=> $user->last_login_at?->format('d-m-Y H:i:s'),
                'orders_count' => $user->orders_count,
                'deleted_at'   => $user->deleted_at?->format('d-m-Y H:i:s'),
                'created_at'   => $user->created_at?->format('d-m-Y H:i:s'),
            ]),
        ]);
    }

    // =========================================================================
    // PUT /api/admin/users/{id} — Cập nhật user (role, status, profile)
    // =========================================================================
    public function update(UpdateUserRequest $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);
        $user->update($request->validated());
        $user->load('role');

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật thông tin người dùng thành công.',
            'data'    => new UserResource($user),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/users/{id} — Soft delete user
    // =========================================================================
    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = User::findOrFail($id);

        // An toàn: admin không thể tự xóa chính mình
        if ($user->id === $request->user()->id) {
            return response()->json([
                'status'  => false,
                'message' => 'Bạn không thể xóa tài khoản đang đăng nhập.',
            ], 400);
        }

        $user->delete();

        return response()->json([
            'status'  => true,
            'message' => "Đã xóa người dùng \"{$user->fullname}\". Có thể khôi phục qua POST /admin/users/{id}/restore.",
        ]);
    }

    // =========================================================================
    // POST /api/admin/users/{id}/restore — Khôi phục user đã xóa mềm
    // =========================================================================
    public function restore(string $id): JsonResponse
    {
        $user = User::withTrashed()->findOrFail($id);

        if (!$user->trashed()) {
            return response()->json([
                'status'  => false,
                'message' => 'Người dùng này chưa bị xóa, không cần khôi phục.',
            ], 422);
        }

        $user->restore();

        return response()->json([
            'status'  => true,
            'message' => "Đã khôi phục người dùng \"{$user->fullname}\" thành công.",
            'data'    => new UserResource($user->load('role')),
        ]);
    }
}
