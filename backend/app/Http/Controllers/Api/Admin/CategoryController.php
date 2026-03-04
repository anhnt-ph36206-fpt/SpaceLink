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

class CategoryController extends Controller
{
    // =========================================================================
    // GET /api/admin/categories
    // =========================================================================
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
