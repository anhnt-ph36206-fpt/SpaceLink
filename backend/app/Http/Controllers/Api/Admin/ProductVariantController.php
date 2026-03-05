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

        $data = $request->except(['attribute_ids', 'image']);
    if ($request->hasFile('image')) {
        $data['image'] = $request->file('image')->store('products/variants', 'public');
    } elseif (is_string($request->image)) {
        $data['image'] = $request->image;
    }

    $variant = $parentProduct->variants()->create($data);

        // Sync attributes (many-to-many)
        if ($request->filled('attribute_ids')) {
            $variant->attributes()->sync($request->attribute_ids);
        }

        $variant->load('attributes.attributeGroup');

        return response()->json([
            'status'  => true,
            'message' => 'Tạo biến thể thành công.',
            'data'    => $this->formatVariant($variant),
        ], 201);
    }

    // =========================================================================
    // PUT /api/admin/products/{product}/variants/{variant} — Cập nhật variant
    // =========================================================================
    public function update(UpdateVariantRequest $request, string $product, string $variant): JsonResponse
    {
        $variantModel = ProductVariant::where('product_id', $product)
            ->findOrFail($variant);

        $data = $request->except(['attribute_ids', 'image']);
    
    if ($request->hasFile('image')) {
        // Delete old image if exists? (optional)
        $data['image'] = $request->file('image')->store('products/variants', 'public');
    } elseif ($request->has('image') && is_string($request->image)) {
        // Keep existing image URL/path or clear it if empty string
        $data['image'] = $request->image;
    } elseif ($request->has('image') && $request->image === null) {
        $data['image'] = null;
    }

    $variantModel->update($data);

        // Sync attributes
        if ($request->has('attribute_ids')) {
            $variantModel->attributes()->sync($request->attribute_ids ?? []);
        }

        $variantModel->load('attributes.attributeGroup');

        return response()->json([
            'status'  => true,
            'message' => 'Cập nhật biến thể thành công.',
            'data'    => $this->formatVariant($variantModel),
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

    // Helper — format variant với attributes
    private function formatVariant(ProductVariant $v): array
    {
        return [
            'id'         => $v->id,
            'sku'        => $v->sku,
            'price'      => $v->price,
            'sale_price' => $v->sale_price,
            'quantity'   => $v->quantity,
            'image'      => $v->image,
            'is_active'  => $v->is_active,
            'attributes' => $v->attributes->map(fn($a) => [
                'id'                 => $a->id,
                'value'              => $a->value,
                'color_code'         => $a->color_code,
                'group_name'         => $a->attributeGroup?->name,
                'group_display_name' => $a->attributeGroup?->display_name,
            ]),
        ];
    }
}
