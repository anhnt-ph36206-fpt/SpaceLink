<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProductImageController extends Controller
{
    // =========================================================================
    // POST /api/admin/products/{product}/images — Thêm ảnh cho sản phẩm
    // =========================================================================
    public function store(Request $request, string $product): JsonResponse
    {
        // Validate inline vì ProductImage đơn giản
        $validated = $request->validate([
            'image_path'    => 'required|string|max:255',
            'is_primary'    => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $parentProduct = Product::findOrFail($product);

        // Nếu set làm ảnh chính, bỏ ảnh chính cũ
        if (!empty($validated['is_primary'])) {
            $parentProduct->images()->update(['is_primary' => false]);
        }

        $image = $parentProduct->images()->create([
            'image_path'    => $validated['image_path'],
            'is_primary'    => $validated['is_primary'] ?? false,
            'display_order' => $validated['display_order'] ?? 0,
        ]);

        return response()->json([
            'status'  => true,
            'message' => 'Thêm ảnh thành công.',
            'data'    => [
                'id'            => $image->id,
                'image_path'    => $image->image_path,
                'image_url'     => url('storage/' . $image->image_path),
                'is_primary'    => $image->is_primary,
                'display_order' => $image->display_order,
            ],
        ], 201);
    }

    // =========================================================================
    // DELETE /api/admin/products/{product}/images/{image} — Xóa ảnh
    // =========================================================================
    public function destroy(string $product, string $image): JsonResponse
    {
        // Kiểm tra ảnh thuộc đúng product này (tránh IDOR)
        $imageModel = ProductImage::where('product_id', $product)
            ->findOrFail($image);

        $imageModel->delete();

        return response()->json([
            'status'  => true,
            'message' => 'Đã xóa ảnh thành công.',
        ]);
    }
}
