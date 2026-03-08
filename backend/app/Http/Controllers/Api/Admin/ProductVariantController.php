<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\StoreVariantRequest;
use App\Http\Requests\Admin\Product\UpdateVariantRequest;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductVariantController extends Controller
{
    // =========================================================================
    // GET /api/admin/products/{product}/variants — Lấy danh sách variant
    // =========================================================================
    public function index(string $product): JsonResponse
    {
        $parentProduct = Product::findOrFail($product);

        $variants = ProductVariant::where('product_id', $parentProduct->id)
            ->with('attributes.attributeGroup')
            ->get()
            ->map(fn($v) => $this->formatVariant($v));

        return response()->json([
            'status'  => true,
            'message' => 'Danh sách biến thể.',
            'data'    => $variants,
        ]);
    }

    // =========================================================================
    // POST /api/admin/products/{product}/variants — Thêm variant mới
    // =========================================================================
    public function store(StoreVariantRequest $request, string $product): JsonResponse
    {
        DB::beginTransaction();
        try {
            $parentProduct = Product::findOrFail($product);

            $data = $request->except(['attribute_ids', 'image']);
            $data['image'] = $this->handleImageUpload($request);

            $variant = $parentProduct->variants()->create($data);

            // Sync attributes (many-to-many)
            if ($request->filled('attribute_ids')) {
                $variant->attributes()->sync($request->attribute_ids);
            }

            $variant->load('attributes.attributeGroup');

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Tạo biến thể thành công.',
                'data'    => $this->formatVariant($variant),
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi tạo biến thể: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Tạo biến thể thất bại.',
            ], 500);
        }
    }

    // =========================================================================
    // PUT /api/admin/products/{product}/variants/{variant} — Cập nhật variant
    // =========================================================================
    public function update(UpdateVariantRequest $request, string $product, string $variant): JsonResponse
    {
        DB::beginTransaction();
        try {
            $variantModel = ProductVariant::where('product_id', $product)->findOrFail($variant);

            $data = $request->except(['attribute_ids', 'image']);

            // Xử lý ảnh — dọn ảnh cũ nếu upload mới
            if ($request->hasFile('image')) {
                $this->deleteStorageFile($variantModel->image);
                $data['image'] = $request->file('image')->store('products/variants', 'public');
            } elseif ($request->has('image') && is_string($request->image)) {
                $data['image'] = $request->image;
            } elseif ($request->has('image') && $request->image === null) {
                $this->deleteStorageFile($variantModel->image);
                $data['image'] = null;
            }

            $variantModel->update($data);

            // Sync attributes
            if ($request->has('attribute_ids')) {
                $variantModel->attributes()->sync($request->attribute_ids ?? []);
            }

            $variantModel->load('attributes.attributeGroup');

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Cập nhật biến thể thành công.',
                'data'    => $this->formatVariant($variantModel),
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi cập nhật biến thể: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Cập nhật biến thể thất bại.',
            ], 500);
        }
    }

    // =========================================================================
    // DELETE /api/admin/products/{product}/variants/{variant} — Xóa variant
    // =========================================================================
    public function destroy(string $product, string $variant): JsonResponse
    {
        $variantModel = ProductVariant::where('product_id', $product)->findOrFail($variant);

        if ($variantModel->orderItems()->exists()) {
            return response()->json([
                'status'  => false,
                'message' => 'Không thể xoá biến thể vì biến thể đã phát sinh đơn hàng.',
            ], 400);
        }

        DB::beginTransaction();
        try {
            // Dọn file ảnh trước khi soft-delete
            if ($variantModel->image) {
                $this->deleteStorageFile($variantModel->image);
            }

            $variantModel->delete(); // SoftDelete

            DB::commit();

            return response()->json([
                'status'  => true,
                'message' => 'Đã xóa biến thể thành công.',
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Lỗi xóa biến thể: ' . $e->getMessage());
            return response()->json([
                'status'  => false,
                'message' => 'Xóa biến thể thất bại.',
            ], 500);
        }
    }

    // =========================================================================
    // Private Helpers
    // =========================================================================

    /** Upload ảnh từ file hoặc giữ nguyên string URL */
    private function handleImageUpload($request): ?string
    {
        if ($request->hasFile('image')) {
            return $request->file('image')->store('products/variants', 'public');
        }
        if (is_string($request->image) && !empty($request->image)) {
            return $request->image;
        }
        return null;
    }

    /** Xóa file khỏi Storage nếu tồn tại */
    private function deleteStorageFile(?string $imagePath): void
    {
        if (!$imagePath) return;

        // Xử lý cả full URL lẫn relative path
        $path = Str::startsWith($imagePath, ['http://', 'https://'])
            ? Str::after($imagePath, '/storage/')
            : ltrim($imagePath, '/');

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    /** @return array<string, mixed> */
    private function formatVariant(ProductVariant $v): array
    {
        $attrs = $v->attributes->map(fn($a) => [
            'id'                 => $a->id,
            'value'              => $a->value,
            'color_code'         => $a->color_code,
            'group_name'         => $a->attributeGroup?->name,
            'group_display_name' => $a->attributeGroup?->display_name,
        ])->values()->all();

        return [
            'id'         => $v->id,
            'sku'        => $v->sku,
            'price'      => $v->price,
            'sale_price' => $v->sale_price,
            'quantity'   => $v->quantity,
            'image'      => $v->image
                ? (Str::startsWith($v->image, ['http://', 'https://'])
                    ? $v->image
                    : asset('storage/' . $v->image))
                : null,
            'is_active'  => $v->is_active,
            'attributes' => $attrs,
        ];
    }
}
