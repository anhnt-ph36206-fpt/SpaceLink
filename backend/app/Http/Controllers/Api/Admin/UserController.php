<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\User\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

class UserController extends Controller
{
    // =========================================================================
    // GET /api/admin/users — Danh sách người dùng (filter + paginate)
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/users',
        summary: '[Admin] Danh sách người dùng',
        tags: ['Admin - Users'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search',   in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo fullname, email, phone'),
            new OA\Parameter(name: 'role_id',  in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: '1=Admin, 2=Staff, 3=Customer'),
            new OA\Parameter(name: 'status',   in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'active | inactive | banned'),
            new OA\Parameter(name: 'trashed',  in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'true = chỉ lấy user đã xóa mềm'),
            new OA\Parameter(name: 'per_page', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 15)'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 401, description: 'Chưa xác thực'),
            new OA\Response(response: 403, description: 'Không phải Admin'),
        ]
    )]
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
    #[OA\Get(
        path: '/api/admin/users/{id}',
        summary: '[Admin] Chi tiết người dùng',
        tags: ['Admin - Users'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID người dùng'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
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
    #[OA\Put(
        path: '/api/admin/users/{id}',
        summary: '[Admin] Cập nhật thông tin người dùng',
        tags: ['Admin - Users'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'fullname',      type: 'string',  nullable: true),
                    new OA\Property(property: 'phone',         type: 'string',  nullable: true),
                    new OA\Property(property: 'role_id',       type: 'integer', description: '1=Admin 2=Staff 3=Customer'),
                    new OA\Property(property: 'status',        type: 'string',  enum: ['active', 'inactive', 'banned']),
                    new OA\Property(property: 'gender',        type: 'string',  enum: ['male', 'female', 'other'], nullable: true),
                    new OA\Property(property: 'date_of_birth', type: 'string',  format: 'date', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
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
    #[OA\Delete(
        path: '/api/admin/users/{id}',
        summary: '[Admin] Xóa mềm người dùng',
        tags: ['Admin - Users'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa'),
            new OA\Response(response: 400, description: 'Không thể tự xóa chính mình'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
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
    #[OA\Post(
        path: '/api/admin/users/{id}/restore',
        summary: '[Admin] Khôi phục người dùng đã xóa mềm',
        tags: ['Admin - Users'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID user đã bị xóa mềm'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Khôi phục thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy user đã xóa'),
            new OA\Response(response: 422, description: 'User chưa bị xóa'),
        ]
    )]
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
