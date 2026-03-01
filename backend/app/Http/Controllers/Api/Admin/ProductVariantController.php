<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\StoreVariantRequest;
use App\Http\Requests\Admin\Product\UpdateVariantRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use OpenApi\Attributes as OA;

class ProductVariantController extends Controller
{
    // =========================================================================
    // POST /api/admin/products/{product}/variants — Thêm variant mới
    // =========================================================================
    #[OA\Post(
        path: '/api/admin/products/{product}/variants',
        summary: '[Admin] Thêm biến thể cho sản phẩm',
        tags: ['Admin - Product Variants'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['price'],
                properties: [
                    new OA\Property(property: 'sku',        type: 'string',  nullable: true),
                    new OA\Property(property: 'price',      type: 'number'),
                    new OA\Property(property: 'sale_price', type: 'number',  nullable: true),
                    new OA\Property(property: 'quantity',   type: 'integer', nullable: true),
                    new OA\Property(property: 'image',      type: 'string',  nullable: true, description: 'Đường dẫn ảnh variant'),
                    new OA\Property(property: 'is_active',  type: 'boolean', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Tạo variant thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
    public function store(StoreVariantRequest $request, string $product): JsonResponse
    {
        $parentProduct = Product::findOrFail($product);

        $variant = $parentProduct->variants()->create($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Tạo biến thể thành công.',
            'data'    => $variant,
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/products/{product}/variants/{variant} — Cập nhật variant
    // =========================================================================
    #[OA\Put(
        path: '/api/admin/products/{product}/variants/{variant}',
        summary: '[Admin] Cập nhật biến thể sản phẩm',
        tags: ['Admin - Product Variants'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
            new OA\Parameter(name: 'variant', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID biến thể'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['price'],
                properties: [
                    new OA\Property(property: 'sku',        type: 'string',  nullable: true),
                    new OA\Property(property: 'price',      type: 'number'),
                    new OA\Property(property: 'sale_price', type: 'number',  nullable: true),
                    new OA\Property(property: 'quantity',   type: 'integer', nullable: true),
                    new OA\Property(property: 'image',      type: 'string',  nullable: true),
                    new OA\Property(property: 'is_active',  type: 'boolean', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy variant'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
    public function update(UpdateVariantRequest $request, string $product, string $variant): JsonResponse
    {
        // Đảm bảo variant thuộc đúng product này
        $variantModel = ProductVariant::where('product_id', $product)
            ->findOrFail($variant);

        $variantModel->update($request->validated());

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật biến thể thành công.',
            'data'    => $variantModel,
        ]);
    }

    // =========================================================================
    // DELETE /api/admin/products/{product}/variants/{variant} — Xóa variant
    // =========================================================================
    #[OA\Delete(
        path: '/api/admin/products/{product}/variants/{variant}',
        summary: '[Admin] Xóa biến thể sản phẩm',
        tags: ['Admin - Product Variants'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'variant', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa variant'),
            new OA\Response(response: 404, description: 'Không tìm thấy variant'),
        ]
    )]
    public function destroy(string $product, string $variant): JsonResponse
    {
        $variantModel = ProductVariant::where('product_id', $product)
            ->findOrFail($variant);

        $variantModel->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xóa biến thể thành công.',
        ]);
    }
}
