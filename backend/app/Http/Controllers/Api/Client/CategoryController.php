<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class CategoryController extends Controller
{
    /**
     * Lấy danh sách danh mục (phía Client).
     *
     * Query Params:
     *   ?type=tree  → Trả về cây danh mục (chỉ root + children eager load).
     *   (không có) → Flat list: toàn bộ danh mục active.
     *
     * Performance: Không N+1 — children được Eager Load trong 1 query.
     */    public function index(Request $request): AnonymousResourceCollection
    {
        // ── Base query: chỉ lấy active, sắp xếp theo display_order ──────────
        $query = Category::where('is_active', true)
                         ->orderBy('display_order', 'asc');

        // ── Chế độ Tree ──────────────────────────────────────────────────────
        if ($request->input('type') === 'tree') {
            $query
                // Chỉ lấy danh mục gốc (parent_id IS NULL)
                ->whereNull('parent_id')

                // Eager Load children — BẮT BUỘC ép điều kiện để loại bỏ
                // children đã bị ẩn (is_active = false), tránh lỗi N+1
                ->with(['children' => function ($q) {
                    $q->where('is_active', true)
                      ->orderBy('display_order', 'asc');

                    // ── Hỗ trợ danh mục cấp 3 (bật khi dự án có 3 cấp) ──
                    // $q->with(['children' => function ($subQ) {
                    //     $subQ->where('is_active', true)
                    //          ->orderBy('display_order', 'asc');
                    // }]);
                }]);
        }

        $categories = $query->get();

        return CategoryResource::collection($categories);
    }

    /**
     * Lấy chi tiết 1 danh mục theo slug (phía Client).
     *
     * - Tìm theo slug + is_active = true.
     * - Tự động load parent để trả về thông tin danh mục cha (nếu có).
     * - Trả về 404 nếu không tìm thấy hoặc danh mục đã bị ẩn.
     */    public function show(string $slug): CategoryResource
    {
        // firstOrFail() tự throw ModelNotFoundException → Laravel chuyển thành 404
        $category = Category::where('slug', $slug)
                            ->where('is_active', true)
                            ->with('parent')        // Eager load parent để không N+1
                            ->firstOrFail();

        return new CategoryResource($category);
    }
}
