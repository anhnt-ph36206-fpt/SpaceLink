<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CategoryController extends Controller
{
    // =========================================================================
    // HELPER: Tạo slug duy nhất từ tên, tự động thêm số đuôi nếu trùng
    // =========================================================================
    private function generateUniqueSlug(string $name, ?int $excludeId = null): string
    {
        $base = Str::slug($name, '-');
        if (empty($base)) {
            $base = 'danh-muc';
        }

        $slug   = $base;
        $suffix = 1;

        while (true) {
            $query = Category::withTrashed()->where('slug', $slug);
            if ($excludeId) {
                $query->where('id', '!=', $excludeId);
            }
            if (!$query->exists()) {
                break;
            }
            $slug = $base . '-' . $suffix;
            $suffix++;
        }

        return $slug;
    }

    // =========================================================================
    // POST /api/admin/categories/{id}/reassign-products
    // Chuyển toàn bộ sản phẩm của danh mục sang danh mục khác (bulk 1 câu query)
    // =========================================================================
    public function reassignProducts(Request $request, string $id): JsonResponse
    {
        $request->validate([
            'target_category_id' => 'required|integer|exists:categories,id|different:' . $id,
        ], [
            'target_category_id.required'  => 'Vui lòng chọn danh mục đích.',
            'target_category_id.exists'    => 'Danh mục đích không tồn tại.',
            'target_category_id.different' => 'Danh mục đích phải khác danh mục hiện tại.',
        ]);

        $moved = Product::where('category_id', $id)
            ->update(['category_id' => $request->target_category_id]);

        return response()->json([
            'status'  => true,
            'message' => "Đã chuyển {$moved} sản phẩm sang danh mục mới.",
            'moved'   => $moved,
        ]);
    }

    // =========================================================================
    // HELPER: Lấy tất cả ID con (đệ quy) của một danh mục
    // =========================================================================
    private function getDescendantIds(int $parentId): array
    {
        $ids      = [];
        $children = Category::where('parent_id', $parentId)->withTrashed()->pluck('id');

        foreach ($children as $childId) {
            $ids[] = $childId;
            $ids   = array_merge($ids, $this->getDescendantIds($childId));
        }

        return $ids;
    }

    // =========================================================================
    // HELPER: Xây cây danh mục đệ quy từ danh sách phẳng
    // =========================================================================
    private function buildTree(array $items, ?int $parentId = null): array
    {
        $branch = [];
        foreach ($items as $item) {
            if ($item['parent_id'] === $parentId) {
                $children = $this->buildTree($items, $item['id']);
                if (!empty($children)) {
                    $item['children'] = $children;
                }
                $branch[] = $item;
            }
        }
        return $branch;
    }

    // =========================================================================
    // GET /api/admin/categories
    // Trả về danh sách phẳng (phân trang) hoặc cây (khi ?tree=1)
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection|JsonResponse
    {
        $query = Category::withTrashed(false)
            ->with('parent')
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

        // Filter: theo danh mục cha
        if ($request->has('parent_id')) {
            $parentId = $request->parent_id;
            if ($parentId == 0) {
                $query->whereNull('parent_id');
            } else {
                $query->where('parent_id', $parentId);
            }
        }

        // Trả về cây đệ quy khi ?tree=1
        if ($request->has('tree')) {
            $all   = $query->get()->toArray();
            $tree  = $this->buildTree($all);
            return response()->json(['data' => $tree]);
        }

        // Trả về tất cả (phẳng) khi ?all=1
        if ($request->has('all')) {
            return CategoryResource::collection($query->get());
        }

        $perPage = (int) $request->get('per_page', 10);
        return CategoryResource::collection($query->paginate($perPage));
    }

    // =========================================================================
    // GET /api/admin/categories/{id}
    // =========================================================================
    public function show(string $id): CategoryResource
    {
        $category = Category::with(['parent', 'children'])
            ->withCount('products')
            ->findOrFail($id);

        return new CategoryResource($category);
    }

    // =========================================================================
    // POST /api/admin/categories
    // Tự động tạo slug từ tên, đảm bảo duy nhất
    // =========================================================================
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'name'          => 'required|string|max:255',
            'parent_id'     => 'nullable|integer|exists:categories,id',
            'image'         => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'icon'          => 'nullable|string|max:100',
            'description'   => 'nullable|string',
            'display_order' => 'nullable|integer',
            'is_active'     => 'nullable|boolean',
        ], [
            'name.required'    => 'Tên danh mục không được để trống.',
            'parent_id.exists' => 'Danh mục cha không tồn tại.',
        ]);

        $data         = $request->only(['name', 'parent_id', 'icon', 'description', 'display_order', 'is_active']);
        $data['slug'] = $this->generateUniqueSlug($request->name);

        if ($request->hasFile('image')) {
            $data['image'] = $request->file('image')->store('categories', 'public');
        }

        $category = Category::create($data);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo danh mục thành công.',
            'data'    => new CategoryResource($category->load('parent')->loadCount('products')),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/categories/{id}
    // Chặn circular reference: không cho chọn chính nó hoặc con của nó làm cha
    // =========================================================================
    public function update(Request $request, string $id): JsonResponse
    {
        $category = Category::findOrFail($id);

        $request->validate([
            'name'          => 'required|string|max:255',
            'parent_id'     => 'nullable|integer|exists:categories,id',
            'image'         => 'nullable|image|mimes:jpeg,png,jpg,gif,webp|max:2048',
            'icon'          => 'nullable|string|max:100',
            'description'   => 'nullable|string',
            'display_order' => 'nullable|integer',
            'is_active'     => 'nullable|boolean',
        ], [
            'name.required'    => 'Tên danh mục không được để trống.',
            'parent_id.exists' => 'Danh mục cha không tồn tại.',
        ]);

        // ── Chặn lỗi lặp vô hạn (circular reference) ──────────────────────
        if ($request->filled('parent_id')) {
            $newParentId = (int) $request->parent_id;

            // Không được chọn chính nó làm cha
            if ($newParentId === (int) $id) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Một danh mục không thể là danh mục cha của chính nó.',
                ], 422);
            }

            // Không được chọn danh mục con (ở bất kỳ cấp nào) làm cha
            $descendantIds = $this->getDescendantIds((int) $id);
            if (in_array($newParentId, $descendantIds)) {
                return response()->json([
                    'status'  => false,
                    'message' => 'Không thể chọn danh mục con làm danh mục cha (sẽ gây vòng lặp vô hạn).',
                ], 422);
            }
        }

        $data = $request->only(['name', 'parent_id', 'icon', 'description', 'display_order', 'is_active']);

        // Tái tạo slug nếu tên thay đổi, đảm bảo duy nhất (bỏ qua chính nó)
        if ($request->filled('name') && $request->name !== $category->name) {
            $data['slug'] = $this->generateUniqueSlug($request->name, (int) $id);
        }

        if ($request->hasFile('image')) {
            if ($category->image) {
                Storage::disk('public')->delete($category->image);
            }
            $data['image'] = $request->file('image')->store('categories', 'public');
        }

        $category->update($data);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật danh mục thành công.',
            'data'    => new CategoryResource($category->fresh()->load('parent')->loadCount('products')),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/categories/{id}
    // Soft Delete — chỉ ẩn, KHÔNG xóa dữ liệu
    // Chặn nếu: đang chứa danh mục con HOẶC đang chứa sản phẩm
    // =========================================================================
    public function destroy(string $id): JsonResponse
    {
        $category = Category::withCount(['products', 'children'])->findOrFail($id);

        // Kiểm tra danh mục con
        if ($category->children_count > 0) {
            return response()->json([
                'status'  => false,
                'message' => "Không thể ẩn danh mục đang chứa {$category->children_count} danh mục con. Vui lòng xóa hoặc chuyển các danh mục con trước.",
            ], 400);
        }

        // Kiểm tra sản phẩm
        if ($category->products_count > 0) {
            return response()->json([
                'status'  => false,
                'message' => "Không thể ẩn danh mục đang chứa {$category->products_count} sản phẩm. Vui lòng chuyển sản phẩm sang danh mục khác trước.",
            ], 400);
        }

        $category->delete(); // SoftDelete: cập nhật deleted_at, giữ nguyên data

        return response()->json([
            'status'  => true,
            'message' => 'Đã ẩn danh mục thành công. Dữ liệu vẫn được lưu trong hệ thống.',
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/categories/{id}/force
    // Hard Delete — xóa vĩnh viễn
    // Chặn nếu: đang chứa danh mục con HOẶC đang chứa sản phẩm
    // =========================================================================
    public function forceDelete(string $id): JsonResponse
    {
        $category = Category::withCount(['products', 'children'])->withTrashed()->findOrFail($id);

        if ($category->children_count > 0) {
            return response()->json([
                'status'  => false,
                'message' => "Không thể xóa vĩnh viễn danh mục đang chứa {$category->children_count} danh mục con.",
            ], 400);
        }

        if ($category->products_count > 0) {
            return response()->json([
                'status'  => false,
                'message' => "Không thể xóa vĩnh viễn danh mục đang chứa {$category->products_count} sản phẩm.",
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
