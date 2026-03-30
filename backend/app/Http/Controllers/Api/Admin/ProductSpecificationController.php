<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductSpecification;
use Illuminate\Http\Request;

class ProductSpecificationController extends Controller
{
    /**
     * GET /api/admin/products/{product}/specifications
     * Lấy danh sách thông số kỹ thuật của 1 sản phẩm, nhóm theo spec_group
     */
    public function index(Product $product)
    {
        $specs = $product->specifications()
            ->with('specGroup')
            ->orderBy('spec_group_id')
            ->orderBy('display_order')
            ->get();

        // Group by spec_group
        $grouped = $specs->groupBy(fn($s) => $s->specGroup?->display_name ?? 'Khác');
        $result = $grouped->map(fn($items, $group) => [
            'group' => $group,
            'specs' => $items->map(fn($s) => [
                'id'            => $s->id,
                'spec_group_id' => $s->spec_group_id,
                'name'          => $s->name,
                'value'         => $s->value,
                'display_order' => $s->display_order,
            ])->values(),
        ])->values();

        return response()->json(['product_id' => $product->id, 'data' => $result]);
    }

    /**
     * POST /api/admin/products/{product}/specifications
     * Thêm 1 thông số kỹ thuật
     */
    public function store(Request $request, Product $product)
    {
        $validated = $request->validate([
            'spec_group_id' => 'required|integer|exists:spec_groups,id',
            'name'          => 'required|string|max:150',
            'value'         => 'required|string|max:500',
            'display_order' => 'nullable|integer',
        ]);

        $validated['product_id'] = $product->id;
        $spec = ProductSpecification::create($validated);
        $spec->load('specGroup');

        return response()->json(['message' => 'Thêm thông số thành công', 'data' => $spec], 201);
    }

    /**
     * PUT /api/admin/products/{product}/specifications/{spec}
     * Cập nhật 1 thông số kỹ thuật
     */
    public function update(Request $request, Product $product, ProductSpecification $specification)
    {
        abort_if($specification->product_id !== $product->id, 404);

        $validated = $request->validate([
            'spec_group_id' => 'sometimes|integer|exists:spec_groups,id',
            'name'          => 'sometimes|string|max:150',
            'value'         => 'sometimes|string|max:500',
            'display_order' => 'nullable|integer',
        ]);

        $specification->update($validated);
        $specification->load('specGroup');

        return response()->json(['message' => 'Cập nhật thành công', 'data' => $specification]);
    }

    /**
     * DELETE /api/admin/products/{product}/specifications/{spec}
     * Xóa 1 thông số kỹ thuật
     */
    public function destroy(Product $product, ProductSpecification $specification)
    {
        abort_if($specification->product_id !== $product->id, 404);
        $specification->delete();
        return response()->json(['message' => 'Đã xóa thông số']);
    }

    /**
     * PUT /api/admin/products/{product}/specifications/bulk
     * Ghi đè toàn bộ specs của sản phẩm (xóa cũ, tạo mới)
     * Body: { "specifications": [ { spec_group_id, name, value, display_order? }, ... ] }
     */
    public function bulk(Request $request, Product $product)
    {
        $validated = $request->validate([
            'specifications'                => 'required|array',
            'specifications.*.spec_group_id' => 'required|integer|exists:spec_groups,id',
            'specifications.*.name'          => 'required|string|max:150',
            'specifications.*.value'         => 'required|string|max:500',
            'specifications.*.display_order' => 'nullable|integer',
        ]);

        // Delete all existing specs for this product
        $product->specifications()->delete();

        // Re-create from request
        $specs = collect($validated['specifications'])->map(fn($item) => [
            'product_id'    => $product->id,
            'spec_group_id' => $item['spec_group_id'],
            'name'          => $item['name'],
            'value'         => $item['value'],
            'display_order' => $item['display_order'] ?? 0,
            'created_at'    => now(),
            'updated_at'    => now(),
        ])->all();

        ProductSpecification::insert($specs);

        return response()->json(['message' => 'Cập nhật thông số thành công', 'count' => count($specs)]);
    }
}
