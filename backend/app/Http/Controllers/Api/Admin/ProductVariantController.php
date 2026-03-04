<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\StoreVariantRequest;
use App\Http\Requests\Admin\Product\UpdateVariantRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;

class ProductVariantController extends Controller
{
    // =========================================================================
    // POST /api/admin/products/{product}/variants — Thêm variant mới
    // =========================================================================
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
