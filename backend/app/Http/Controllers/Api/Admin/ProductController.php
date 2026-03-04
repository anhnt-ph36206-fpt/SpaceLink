<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\StoreProductRequest;
use App\Http\Requests\Admin\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProductController extends Controller
{
    // =========================================================================
    // GET /api/admin/products — Danh sách sản phẩm (có filter, paginate)
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection
    {
        // Nếu ?trashed=true → chỉ lấy sản phẩm đã xóa mềm
        $showTrashed = filter_var($request->get('trashed', false), FILTER_VALIDATE_BOOLEAN);

        $query = $showTrashed
            ? Product::onlyTrashed()
            : Product::query();

        $query->with(['category:id,name,slug', 'brand:id,name,slug', 'images'])->latest();

        // Tìm kiếm theo tên / slug / SKU
        if ($request->filled('search')) {
            $kw = $request->search;
            $query->where(function ($q) use ($kw) {
                $q->where('name', 'like', "%{$kw}%")
                  ->orWhere('slug', 'like', "%{$kw}%")
                  ->orWhere('sku', 'like', "%{$kw}%");
            });
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        if ($request->has('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        if ($request->has('is_featured')) {
            $query->where('is_featured', filter_var($request->is_featured, FILTER_VALIDATE_BOOLEAN));
        }

        $perPage = min((int) $request->get('per_page', 15), 100);
        $products = $query->paginate($perPage);

        return ProductResource::collection($products);
    }

    // =========================================================================
    // GET /api/admin/products/{id} — Chi tiết sản phẩm (kèm variants + images)
    // =========================================================================
    public function show(string $id): ProductResource
    {
        $product = Product::with([
            'category:id,name,slug',
            'brand:id,name,slug',
            'images',
            'variants',
            'variants.attributes.attributeGroup',
        ])->findOrFail($id);

        return new ProductResource($product);
    }

    // =========================================================================
    // POST /api/admin/products — Tạo mới sản phẩm
    // =========================================================================
    public function store(StoreProductRequest $request): JsonResponse
    {
        $product = Product::create($request->validated());
        $product->load(['category:id,name', 'brand:id,name', 'images', 'variants']);

        return response()->json([
            'status'  => true,
            'message' => 'Tạo sản phẩm thành công.',
            'data'    => new ProductResource($product),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/products/{id} — Cập nhật sản phẩm
    // =========================================================================
    public function update(UpdateProductRequest $request, string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update($request->validated());
        $product->load(['category:id,name', 'brand:id,name', 'images', 'variants']);

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật sản phẩm thành công.',
            'data'    => new ProductResource($product),
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/products/{id} — Soft delete sản phẩm
    // =========================================================================
    public function destroy(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->delete(); // Soft delete (SoftDeletes trait)

        return response()->json([
            'status'  => true,
            'message' => "Đã xóa sản phẩm \"{$product->name}\". Có thể khôi phục qua POST /admin/products/{id}/restore.",
        ]);
    }

    // =========================================================================
    // POST /api/admin/products/{id}/restore — Khôi phục sản phẩm đã xóa mềm
    // =========================================================================
    public function restore(string $id): JsonResponse
    {
        // withTrashed() để có thể tìm thấy cả sản phẩm đã xóa mềm
        $product = Product::withTrashed()->findOrFail($id);

        if (!$product->trashed()) {
            return response()->json([
                'status'  => false,
                'message' => 'Sản phẩm này chưa bị xóa, không cần khôi phục.',
            ], 422);
        }

        $product->restore(); // Set deleted_at = NULL

        return response()->json([
            'status'  => true,
            'message' => "Đã khôi phục sản phẩm \"{$product->name}\" thành công.",
            'data'    => new ProductResource($product),
        ]);
    }
}
