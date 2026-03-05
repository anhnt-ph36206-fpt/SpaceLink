<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class ProductImageController extends Controller
{
    // =========================================================================
    // POST /api/admin/products/{product}/images — Thêm ảnh cho sản phẩm
    // =========================================================================
    #[OA\Post(
        path: '/api/admin/products/{product}/images',
        summary: '[Admin] Thêm ảnh sản phẩm',
        tags: ['Admin - Product Images'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID sản phẩm'),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['image_path'],
                properties: [
                    new OA\Property(property: 'image_path',    type: 'string',  description: 'Đường dẫn ảnh (relative: products/...)'),
                    new OA\Property(property: 'is_primary',    type: 'boolean', nullable: true, description: 'Có phải ảnh đại diện không?'),
                    new OA\Property(property: 'display_order', type: 'integer', nullable: true, description: 'Thứ tự hiển thị'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Thêm ảnh thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
    public function store(Request $request, string $product): JsonResponse
    {
        // Validate
        $validated = $request->validate([
            'image'         => 'required|image|max:5120', // Giới hạn 5MB
            'is_primary'    => 'nullable|boolean',
            'display_order' => 'nullable|integer|min:0',
        ]);

        $parentProduct = Product::findOrFail($product);

        $isPrimary = filter_var($request->input('is_primary', false), FILTER_VALIDATE_BOOLEAN);

        // Nếu set làm ảnh chính, bỏ ảnh chính cũ
        if ($isPrimary) {
            $parentProduct->images()->update(['is_primary' => false]);
        }

        // Lưu file
        $path = $request->file('image')->store('products', 'public');

        $image = $parentProduct->images()->create([
            'image_path'    => $path,
            'is_primary'    => $isPrimary,
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
    #[OA\Delete(
        path: '/api/admin/products/{product}/images/{image}',
        summary: '[Admin] Xóa ảnh sản phẩm',
        tags: ['Admin - Product Images'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'product', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'image',   in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID ảnh'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa ảnh'),
            new OA\Response(response: 404, description: 'Không tìm thấy ảnh'),
        ]
    )]
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
