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
use Illuminate\Support\Facades\Storage;
use OpenApi\Attributes as OA;

class CategoryController extends Controller
{
    // =========================================================================
    // GET /api/admin/categories
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Category::withTrashed(false)   // Không lấy soft-deleted
                         ->with('parent')        // Eager load parent, tránh N+1
                         ->withCount('products')
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

        $perPage = (int) $request->get('per_page', 10);

        if ($request->has('all')) {
            return CategoryResource::collection($query->get());
        }

        return CategoryResource::collection($query->paginate($perPage));
    }

    // =========================================================================
    // GET /api/admin/categories/{id}
    // =========================================================================
    public function show(string $id): CategoryResource
    {
        // Admin xem được cả inactive — không filter is_active
        $category = Category::with(['parent', 'children'])
                            ->withCount('products')
                            ->findOrFail($id);

        return new CategoryResource($category);
    }

    // =========================================================================
    // POST /api/admin/categories
    // =========================================================================
    public function store(StoreCategoryRequest $request): JsonResponse
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('categories', 'public');
        }

        $category = Category::create($data);

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
        $data = $request->validated();

        if ($request->hasFile('image')) {
            // Xóa ảnh cũ nếu có
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $data['image'] = $request->file('image')->store('categories', 'public');
        }

        $category->update($data);

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
        $category = Category::withCount('products')->findOrFail($id);
        
        if ($category->products_count > 0) {
            return response()->json([
                'status' => false,
                'message' => 'Không thể xóa (ẩn) danh mục đang chứa sản phẩm.'
            ], 400);
        }

        $category->delete(); // SoftDelete: set deleted_at, không xóa hẳn

        return response()->json([
            'status'  => true,
            'message' => 'Đã ẩn danh mục thành công.',
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/categories/{id}/force
    // =========================================================================
    public function forceDelete(string $id): JsonResponse
    {
        $category = Category::withCount(['products', 'children'])->withTrashed()->findOrFail($id);
        
        if ($category->products_count > 0) {
            return response()->json([
                'status' => false,
                'message' => 'Không thể xóa vĩnh viễn danh mục đang chứa sản phẩm.'
            ], 400);
        }

        if ($category->children_count > 0) {
            return response()->json([
                'status' => false,
                'message' => 'Không thể xóa vĩnh viễn danh mục đang chứa danh mục con.'
            ], 400);
        }

        if ($category->image) {
            Storage::disk('public')->delete($category->image);
        }
        
        $category->forceDelete();

        return response()->json([
            'status'  => true,
            'message' => 'Xóa vĩnh viễn danh mục thành công.',
        ]);
    }
}
