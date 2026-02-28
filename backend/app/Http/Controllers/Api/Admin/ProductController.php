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
use OpenApi\Attributes as OA;

class ProductController extends Controller
{
    // =========================================================================
    // GET /api/admin/products — Danh sách sản phẩm (có filter, paginate)
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/products',
        summary: '[Admin] Danh sách sản phẩm',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search',      in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo tên, slug, SKU'),
            new OA\Parameter(name: 'category_id', in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Lọc theo danh mục'),
            new OA\Parameter(name: 'brand_id',    in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Lọc theo thương hiệu'),
            new OA\Parameter(name: 'is_active',   in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'Lọc theo trạng thái'),
            new OA\Parameter(name: 'is_featured',  in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'Lọc sản phẩm nổi bật'),
            new OA\Parameter(name: 'trashed',     in: 'query', required: false, schema: new OA\Schema(type: 'boolean'), description: 'true = chỉ lấy sản phẩm đã xóa mềm'),
            new OA\Parameter(name: 'per_page',    in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi mỗi trang (mặc định 15)'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 401, description: 'Chưa xác thực'),
            new OA\Response(response: 403, description: 'Không có quyền Admin'),
        ]
    )]
    public function index(Request $request): AnonymousResourceCollection
    {
        // Nếu ?trashed=true → chỉ lấy sản phẩm đã xóa mềm
        $showTrashed = filter_var($request->get('trashed', false), FILTER_VALIDATE_BOOLEAN);

        $query = $showTrashed
            ? Product::onlyTrashed()
            : Product::withTrashed(false);

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
    #[OA\Get(
        path: '/api/admin/products/{id}',
        summary: '[Admin] Chi tiết sản phẩm',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
        ]
    )]
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
    #[OA\Post(
        path: '/api/admin/products',
        summary: '[Admin] Tạo sản phẩm mới',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['category_id', 'name', 'slug', 'price'],
                properties: [
                    new OA\Property(property: 'category_id',      type: 'integer'),
                    new OA\Property(property: 'brand_id',         type: 'integer',  nullable: true),
                    new OA\Property(property: 'name',             type: 'string'),
                    new OA\Property(property: 'slug',             type: 'string'),
                    new OA\Property(property: 'sku',              type: 'string',   nullable: true),
                    new OA\Property(property: 'price',            type: 'number'),
                    new OA\Property(property: 'sale_price',       type: 'number',   nullable: true),
                    new OA\Property(property: 'quantity',         type: 'integer',  nullable: true),
                    new OA\Property(property: 'description',      type: 'string',   nullable: true),
                    new OA\Property(property: 'content',          type: 'string',   nullable: true),
                    new OA\Property(property: 'is_featured',       type: 'boolean',  nullable: true),
                    new OA\Property(property: 'is_active',        type: 'boolean',  nullable: true),
                    new OA\Property(property: 'meta_title',       type: 'string',   nullable: true),
                    new OA\Property(property: 'meta_description', type: 'string',   nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo thành công'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
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
    #[OA\Put(
        path: '/api/admin/products/{id}',
        summary: '[Admin] Cập nhật sản phẩm',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['category_id', 'name', 'slug', 'price'],
                properties: [
                    new OA\Property(property: 'category_id',      type: 'integer'),
                    new OA\Property(property: 'brand_id',         type: 'integer',  nullable: true),
                    new OA\Property(property: 'name',             type: 'string'),
                    new OA\Property(property: 'slug',             type: 'string'),
                    new OA\Property(property: 'sku',              type: 'string',   nullable: true),
                    new OA\Property(property: 'price',            type: 'number'),
                    new OA\Property(property: 'sale_price',       type: 'number',   nullable: true),
                    new OA\Property(property: 'quantity',         type: 'integer',  nullable: true),
                    new OA\Property(property: 'description',      type: 'string',   nullable: true),
                    new OA\Property(property: 'content',          type: 'string',   nullable: true),
                    new OA\Property(property: 'is_featured',       type: 'boolean',  nullable: true),
                    new OA\Property(property: 'is_active',        type: 'boolean',  nullable: true),
                    new OA\Property(property: 'meta_title',       type: 'string',   nullable: true),
                    new OA\Property(property: 'meta_description', type: 'string',   nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
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
    #[OA\Delete(
        path: '/api/admin/products/{id}',
        summary: '[Admin] Xóa mềm sản phẩm',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
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
    #[OA\Post(
        path: '/api/admin/products/{id}/restore',
        summary: '[Admin] Khôi phục sản phẩm đã xóa mềm',
        tags: ['Admin - Products'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm đã bị xóa mềm'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Khôi phục thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm đã xóa'),
        ]
    )]
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
