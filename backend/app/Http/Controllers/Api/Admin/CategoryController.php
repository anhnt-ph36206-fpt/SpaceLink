<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Category\StoreCategoryRequest;
use App\Http\Requests\Admin\Category\UpdateCategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

class CategoryController extends Controller
{
    // =========================================================================
    // GET /api/admin/categories
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/categories',
        summary: 'Danh sách tất cả danh mục (Admin)',
        description: 'Lấy danh sách toàn bộ danh mục kể cả inactive. Hỗ trợ filter theo `search`, `is_active`, `parent_id`.',
        tags: ['Admin - Categories'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Tìm kiếm theo tên danh mục',
                required: false,
                schema: new OA\Schema(type: 'string', example: 'Điện thoại')
            ),
            new OA\Parameter(
                name: 'is_active',
                in: 'query',
                description: 'Lọc theo trạng thái: 1 = đang hiện, 0 = đã ẩn',
                required: false,
                schema: new OA\Schema(type: 'integer', enum: [0, 1])
            ),
            new OA\Parameter(
                name: 'parent_id',
                in: 'query',
                description: 'Lọc theo danh mục cha (0 = chỉ lấy root)',
                required: false,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Danh sách danh mục',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Chưa xác thực'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::withTrashed(false)   // Không lấy soft-deleted
                         ->with('parent')        // Eager load parent, tránh N+1
                         ->orderBy('display_order', 'asc')
                         ->orderBy('id', 'asc');

        // Filter: tìm kiếm theo tên
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filter: theo trạng thái active
        if ($request->has('is_active') && $request->is_active !== '') {
            $query->where('is_active', (bool) $request->is_active);
        }

        // Filter: theo danh mục cha (0 = root)
        if ($request->has('parent_id')) {
            $parentId = $request->parent_id;
            if ($parentId == 0) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $parentId);
            }
        }

        return CategoryResource::collection($query->get());
    }

    // =========================================================================
    // GET /api/admin/categories/{id}
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/categories/{id}',
        summary: 'Chi tiết danh mục (Admin)',
        description: 'Lấy thông tin chi tiết một danh mục theo ID, kể cả inactive.',
        tags: ['Admin - Categories'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'ID của danh mục',
                required: true,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Chi tiết danh mục',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'data', type: 'object'),
                ])
            ),
            new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function show(string $id): CategoryResource
    {
        // Admin xem được cả inactive — không filter is_active
        $category = Category::with(['parent', 'children'])
                            ->findOrFail($id);

        return new CategoryResource($category);
    }

    // =========================================================================
    // POST /api/admin/categories
    // =========================================================================
    #[OA\Post(
        path: '/api/admin/categories',
        summary: 'Tạo danh mục mới (Admin)',
        tags: ['Admin - Categories'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'slug'],
                properties: [
                    new OA\Property(property: 'name',          type: 'string',  example: 'Điện thoại'),
                    new OA\Property(property: 'slug',          type: 'string',  example: 'dien-thoai'),
                    new OA\Property(property: 'parent_id',     type: 'integer', nullable: true, example: null),
                    new OA\Property(property: 'image',         type: 'string',  nullable: true, example: 'categories/phone.jpg'),
                    new OA\Property(property: 'icon',          type: 'string',  nullable: true, example: 'icons/phone.svg'),
                    new OA\Property(property: 'description',   type: 'string',  nullable: true, example: 'Danh mục điện thoại thông minh'),
                    new OA\Property(property: 'display_order', type: 'integer', example: 1),
                    new OA\Property(property: 'is_active',     type: 'boolean', example: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo thành công',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'status',  type: 'boolean', example: true),
                    new OA\Property(property: 'message', type: 'string',  example: 'Tạo danh mục thành công'),
                    new OA\Property(property: 'data',    type: 'object'),
                ])
            ),
            new OA\Response(response: 422, description: 'Lỗi validation'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $category = Category::create($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Tạo danh mục thành công.',
            'data'    => new CategoryResource($category),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/categories/{id}
    // =========================================================================
    #[OA\Put(
        path: '/api/admin/categories/{id}',
        summary: 'Cập nhật danh mục (Admin)',
        tags: ['Admin - Categories'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['name', 'slug'],
                properties: [
                    new OA\Property(property: 'name',          type: 'string',  example: 'Điện thoại'),
                    new OA\Property(property: 'slug',          type: 'string',  example: 'dien-thoai'),
                    new OA\Property(property: 'parent_id',     type: 'integer', nullable: true, example: null),
                    new OA\Property(property: 'image',         type: 'string',  nullable: true, example: 'categories/phone.jpg'),
                    new OA\Property(property: 'icon',          type: 'string',  nullable: true, example: null),
                    new OA\Property(property: 'description',   type: 'string',  nullable: true, example: 'Mô tả mới'),
                    new OA\Property(property: 'display_order', type: 'integer', example: 2),
                    new OA\Property(property: 'is_active',     type: 'boolean', example: false),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'status',  type: 'boolean', example: true),
                    new OA\Property(property: 'message', type: 'string',  example: 'Cập nhật danh mục thành công'),
                    new OA\Property(property: 'data',    type: 'object'),
                ])
            ),
            new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
            new OA\Response(response: 422, description: 'Lỗi validation'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function update(UpdateCategoryRequest $request, string $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->update($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật danh mục thành công.',
            'data'    => new CategoryResource($category->fresh('parent')),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/categories/{id}
    // =========================================================================
    #[OA\Delete(
        path: '/api/admin/categories/{id}',
        summary: 'Xóa mềm danh mục (Admin)',
        description: 'Soft delete — dữ liệu vẫn còn trong DB, chỉ đặt `deleted_at`. Có thể khôi phục sau.',
        tags: ['Admin - Categories'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                required: true,
                schema: new OA\Schema(type: 'integer', example: 1)
            ),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Xóa thành công',
                content: new OA\JsonContent(properties: [
                    new OA\Property(property: 'status',  type: 'boolean', example: true),
                    new OA\Property(property: 'message', type: 'string',  example: 'Xóa danh mục thành công'),
                ])
            ),
            new OA\Response(response: 404, description: 'Không tìm thấy danh mục'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function destroy(string $id): JsonResponse
    {
        $category = Category::findOrFail($id);
        $category->delete(); // SoftDelete: set deleted_at, không xóa hẳn

        return response()->json([
            'status'  => true,
            'message' => 'Xóa danh mục thành công.',
        ]);
    }
}
