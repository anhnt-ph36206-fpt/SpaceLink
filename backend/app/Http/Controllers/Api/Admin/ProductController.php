<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Product\StoreProductRequest;
use App\Http\Requests\Admin\Product\UpdateProductRequest;
use App\Http\Resources\ProductResource;
use App\Models\OrderItem;
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
        $showTrashed = filter_var($request->get('trashed', false), FILTER_VALIDATE_BOOLEAN);

        $query = $showTrashed
            ? Product::onlyTrashed()
            : Product::query();

        $query->with(['category:id,name,slug', 'brand:id,name,slug', 'images'])->latest();

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

        $perPage = min((int) $request->get('per_page', 10), 100);

        if ($request->has('all')) {
            return ProductResource::collection($query->get());
        }

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
    // POST /api/admin/products — Tạo mới sản phẩm (kèm images + variants)
    // =========================================================================
    public function store(StoreProductRequest $request): JsonResponse
    {
        return \DB::transaction(function () use ($request) {
            // Lấy chỉ product fields (loại bỏ images, variants)
            $productData = $request->safe()->except(['images', 'variants']);
            $product = Product::create($productData);

            // ── Xử lý gallery images ──
            $imagesInput = $request->input('images', []);
            if (is_array($imagesInput) && count($imagesInput) > 0) {
                $hasPrimary = false;

                foreach ($imagesInput as $index => $imgData) {
                    $file = $request->file("images.{$index}.file");
                    if (! $file) {
                        continue;
                    }

                    $isPrimary = filter_var($imgData['is_primary'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $displayOrder = (int) ($imgData['display_order'] ?? $index);

                    if ($isPrimary && ! $hasPrimary) {
                        $hasPrimary = true;
                    } elseif ($isPrimary && $hasPrimary) {
                        $isPrimary = false;
                    }

                    if ($index === 0 && ! $hasPrimary) {
                        $isPrimary = true;
                        $hasPrimary = true;
                    }

                    $path = $file->store('products', 'public');

                    $product->images()->create([
                        'image_path' => $path,
                        'is_primary' => $isPrimary,
                        'display_order' => $displayOrder,
                    ]);
                }
            }

            // ── Xử lý variants ──
            if ($request->has('variants')) {
                $variantsInput = $request->input('variants', []);
                foreach ($variantsInput as $index => $varData) {
                    $varFields = [
                        'sku' => $varData['sku'] ?? null,
                        'price' => $varData['price'],
                        'sale_price' => $varData['sale_price'] ?? null,
                        'quantity' => $varData['quantity'] ?? 0,
                        'is_active' => filter_var($varData['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    ];
                    // Xử lý ảnh variant
                    $variantFile = $request->file("variants.{$index}.image");
                    if ($variantFile) {
                        $varFields['image'] = $variantFile->store('products/variants', 'public');
                    }

                    $variant = $product->variants()->create($varFields);

                    // Sync attributes
                    $attributeIds = $varData['attribute_ids'] ?? [];
                    if (! empty($attributeIds)) {
                        $variant->attributes()->sync($attributeIds);
                    }
                }
            }

            $product->load(['category:id,name', 'brand:id,name', 'images', 'variants', 'variants.attributes.attributeGroup']);

            return response()->json([
                'status' => true,
                'message' => 'Tạo sản phẩm thành công.',
                'data' => new ProductResource($product),
            ], 201);
        });
    }

    // =========================================================================
    // PUT /api/admin/products/{id} — Cập nhật sản phẩm (kèm ảnh mới + variant mới)
    // =========================================================================
    public function update(UpdateProductRequest $request, string $id): JsonResponse
    {
        return \DB::transaction(function () use ($request, $id) {
            $product = Product::findOrFail($id);

            // Cập nhật product fields
            $productData = $request->safe()->except(['images', 'variants']);
            $product->update($productData);

            // ── Xử lý cập nhật ảnh đã tồn tại (ví dụ: đổi is_primary) ──
            $existingImagesInput = $request->input('existing_images', []);
            if (is_array($existingImagesInput) && count($existingImagesInput) > 0) {
                foreach ($existingImagesInput as $imgId => $imgData) {
                    $image = $product->images()->find($imgId);
                    if ($image) {
                        $isPrimary = filter_var($imgData['is_primary'] ?? false, FILTER_VALIDATE_BOOLEAN);
                        if ($isPrimary) {
                            // Nếu set cái này là primary, thì unset tất cả cái khác
                            $product->images()->where('id', '!=', $imgId)->update(['is_primary' => false]);
                        }
                        $image->update([
                            'is_primary' => $isPrimary,
                            'display_order' => $imgData['display_order'] ?? $image->display_order,
                        ]);
                    }
                }
            }

            // ── Xử lý ảnh mới (thêm vào) ──
            $imagesInput = $request->input('images', []);
            if (is_array($imagesInput) && count($imagesInput) > 0) {
                // Kiểm tra xem hiện tại product có primary chưa (sau khi đã update existing)
                $existingHasPrimary = $product->images()->where('is_primary', true)->exists();

                foreach ($imagesInput as $index => $imgData) {
                    $file = $request->file("images.{$index}.file");
                    if (! $file) {
                        continue;
                    }

                    $isPrimary = filter_var($imgData['is_primary'] ?? false, FILTER_VALIDATE_BOOLEAN);
                    $displayOrder = (int) ($imgData['display_order'] ?? $index);

                    // Nếu set primary → bỏ primary cũ trước
                    if ($isPrimary) {
                        $product->images()->update(['is_primary' => false]);
                        $existingHasPrimary = true;
                    }

                    // Nếu không có ảnh primary nào và đây là ảnh đầu tiên → set primary
                    if (! $existingHasPrimary && $index === 0) {
                        $isPrimary = true;
                        $existingHasPrimary = true;
                    }

                    $path = $file->store('products', 'public');

                    $product->images()->create([
                        'image_path' => $path,
                        'is_primary' => $isPrimary,
                        'display_order' => $displayOrder,
                    ]);
                }
            }

            // ── Xử lý cập nhật variants đã tồn tại ──
            $existingVariantsInput = $request->input('existing_variants', []);
            if (is_array($existingVariantsInput) && count($existingVariantsInput) > 0) {
                foreach ($existingVariantsInput as $varId => $varData) {
                    $variant = $product->variants()->find($varId);
                    if ($variant) {
                        $varFields = [
                            'sku' => $varData['sku'] ?? $variant->sku,
                            'price' => $varData['price'] ?? $variant->price,
                            'sale_price' => $varData['sale_price'] ?? $variant->sale_price,
                            'quantity' => $varData['quantity'] ?? $variant->quantity,
                            'is_active' => filter_var($varData['is_active'] ?? $variant->is_active, FILTER_VALIDATE_BOOLEAN),
                        ];

                        // Xử lý ảnh variant hiện tại nếu có file mới
                        $variantFile = $request->file("existing_variants.{$varId}.image");
                        if ($variantFile) {
                            $varFields['image'] = $variantFile->store('products/variants', 'public');
                        }

                        $variant->update($varFields);

                        // Sync attributes if provided
                        if (isset($varData['attribute_ids'])) {
                            $variant->attributes()->sync($varData['attribute_ids']);
                        }
                    }
                }
            }

            // ── Xử lý variants mới ──
            if ($request->has('variants')) {
                $variantsInput = $request->input('variants', []);
                foreach ($variantsInput as $index => $varData) {
                    $varFields = [
                        'sku' => $varData['sku'] ?? null,
                        'price' => $varData['price'],
                        'sale_price' => $varData['sale_price'] ?? null,
                        'quantity' => $varData['quantity'] ?? 0,
                        'is_active' => filter_var($varData['is_active'] ?? true, FILTER_VALIDATE_BOOLEAN),
                    ];

                    // Xử lý ảnh variant
                    $variantFile = $request->file("variants.{$index}.image");
                    if ($variantFile) {
                        $varFields['image'] = $variantFile->store('products/variants', 'public');
                    }

                    $variant = $product->variants()->create($varFields);

                    // Sync attributes
                    $attributeIds = $varData['attribute_ids'] ?? [];
                    if (! empty($attributeIds)) {
                        $variant->attributes()->sync($attributeIds);
                    }
                }
            }

            $product->load(['category:id,name', 'brand:id,name', 'images', 'variants', 'variants.attributes.attributeGroup']);

            return response()->json([
                'status' => true,
                'message' => 'Cập nhật sản phẩm thành công.',
                'data' => new ProductResource($product),
            ]);
        });
    }

    // =========================================================================
    // DELETE /api/admin/products/{id} — Soft delete sản phẩm
    // =========================================================================
    public function destroy(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);

        // Không cho xóa nếu sản phẩm đã có trong đơn hàng
        $orderCount = OrderItem::where('product_id', $id)->count();
        if ($orderCount > 0) {
            return response()->json([
                'status' => false,
                'message' => "Không thể xóa sản phẩm \"{$product->name}\" vì đã xuất hiện trong {$orderCount} đơn hàng.",
            ], 400);
        }

        $product->delete();

        return response()->json([
            'status' => true,
            'message' => "Đã xóa sản phẩm \"{$product->name}\". Có thể khôi phục qua POST /admin/products/{id}/restore.",
        ]);
    }

    // =========================================================================
    // POST /api/admin/products/{id}/restore — Khôi phục sản phẩm đã xóa mềm
    // =========================================================================
    public function restore(string $id): JsonResponse
    {
        $product = Product::withTrashed()->findOrFail($id);

        if (! $product->trashed()) {
            return response()->json([
                'status' => false,
                'message' => 'Sản phẩm này chưa bị xóa, không cần khôi phục.',
            ], 400);
        }

        $product->restore();

        return response()->json([
            'status' => true,
            'message' => "Đã khôi phục sản phẩm \"{$product->name}\" thành công.",
            'data' => new ProductResource($product),
        ]);
    }

    // =========================================================================
    // PATCH /api/admin/products/{id}/toggle-active — Bật/tắt trạng thái hiển thị
    // =========================================================================
    public function toggleActive(string $id): JsonResponse
    {
        $product = Product::findOrFail($id);
        $product->update(['is_active' => ! $product->is_active]);

        return response()->json([
            'status' => true,
            'message' => $product->is_active ? 'Sản phẩm đã được bật.' : 'Sản phẩm đã được tắt.',
            'is_active' => $product->is_active,
        ]);
    }

    // =========================================================================
    // POST /api/admin/products/bulk-action — Thao tác hàng loạt
    // =========================================================================
    public function bulkAction(\Illuminate\Http\Request $request): JsonResponse
    {
        $request->validate([
            'action' => 'required|in:delete,restore,set_active,set_inactive,set_featured,unset_featured,set_variants_active,set_variants_inactive',
            'ids' => 'required|array|min:1',
            'ids.*' => 'integer|exists:products,id',
        ]);

        $ids = $request->ids;
        $action = $request->action;
        $count = count($ids);

        switch ($action) {
            case 'delete':
                // Lọc ra các sản phẩm đã có trong đơn hàng — không được xóa
                $blockedIds = OrderItem::whereIn('product_id', $ids)
                    ->distinct()
                    ->pluck('product_id')
                    ->toArray();

                $allowedIds = array_diff($ids, $blockedIds);

                if (! empty($allowedIds)) {
                    Product::whereIn('id', $allowedIds)->delete();
                }

                $deletedCount = count($allowedIds);
                $blockedCount = count($blockedIds);

                $message = "Đã xóa {$deletedCount} sản phẩm.";
                if ($blockedCount > 0) {
                    $message .= " Bỏ qua {$blockedCount} sản phẩm đã có trong đơn hàng (không thể xóa).";
                }

                return response()->json([
                    'status' => true,
                    'message' => $message,
                ]);

            case 'restore':
                Product::withTrashed()->whereIn('id', $ids)->restore();

                return response()->json([
                    'status' => true,
                    'message' => "Đã khôi phục {$count} sản phẩm.",
                ]);

            case 'set_active':
                Product::whereIn('id', $ids)->update(['is_active' => true]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã bật hiển thị {$count} sản phẩm.",
                ]);

            case 'set_inactive':
                Product::whereIn('id', $ids)->update(['is_active' => false]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã tắt hiển thị {$count} sản phẩm.",
                ]);

            case 'set_featured':
                Product::whereIn('id', $ids)->update(['is_featured' => true]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã đặt {$count} sản phẩm thành nổi bật.",
                ]);

            case 'unset_featured':
                Product::whereIn('id', $ids)->update(['is_featured' => false]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã bỏ nổi bật {$count} sản phẩm.",
                ]);

            case 'set_variants_active':
                // Bật tất cả biến thể của các sản phẩm đã chọn
                \App\Models\ProductVariant::whereIn('product_id', $ids)->update(['is_active' => true]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã bật tất cả biến thể của {$count} sản phẩm.",
                ]);

            case 'set_variants_inactive':
                // Tắt tất cả biến thể của các sản phẩm đã chọn
                \App\Models\ProductVariant::whereIn('product_id', $ids)->update(['is_active' => false]);

                return response()->json([
                    'status' => true,
                    'message' => "Đã tắt tất cả biến thể của {$count} sản phẩm.",
                ]);

            default:
                return response()->json(['status' => false, 'message' => 'Hành động không hợp lệ.'], 400);
        }
    }
}
