<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\Category;
use App\Http\Resources\ProductResource;
use App\Http\Resources\ProductCollection;
use Illuminate\Http\Request;

class ProductController extends Controller
{
    /**
     * Lấy tất cả IDs của danh mục và các danh mục con (đệ quy)
     */
    private function getAllCategoryIds(int $categoryId): array
    {
        $ids = [$categoryId];
        $children = Category::where('parent_id', $categoryId)->pluck('id')->toArray();
        foreach ($children as $childId) {
            $ids = array_merge($ids, $this->getAllCategoryIds($childId));
        }
        return $ids;
    }

    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'images', 'variants.attributes.attributeGroup'])
            ->where('is_active', true);

        // Lọc theo danh mục (bao gồm cả danh mục con đệ quy)
        if ($request->filled('category_id')) {
            $categoryIds = $this->getAllCategoryIds((int) $request->category_id);
            $query->whereIn('category_id', $categoryIds);
        }

        // Lọc theo thương hiệu
        if ($request->filled('brand_id')) {
            $query->where('brand_id', $request->brand_id);
        }

        // Tìm kiếm theo tên
        if ($request->filled('keyword')) {
            $keyword = $request->keyword;
            $query->where('name', 'like', "%{$keyword}%");
        }

        // Lọc theo khoảng giá (dùng giá hiệu lực = COALESCE(sale_price, price))
        if ($request->filled('min_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) >= ?', [$request->min_price]);
            });
        }
        if ($request->filled('max_price')) {
            $query->where(function ($q) use ($request) {
                $q->whereRaw('COALESCE(sale_price, price) <= ?', [$request->max_price]);
            });
        }

        // Sắp xếp
        if ($request->has('sort_by')) {
            switch ($request->sort_by) {
                case 'price_asc':
                    $query->orderBy('price', 'asc');
                    break;
                case 'price_desc':
                    $query->orderBy('price', 'desc');
                    break;
                case 'latest':
                    $query->latest();
                    break;
                case 'oldest':
                    $query->oldest();
                    break;
                case 'view_count':
                    $query->orderBy('view_count', 'desc');
                    break;
                default:
                    $query->latest();
                    break;
            }
        } else {
            $query->latest();
        }

        $products = $query->paginate(12);

        return new ProductCollection($products);
    }

    public function show($id)
    {
        // Eager Loading sâu để lấy: Variants -> Attributes -> AttributeGroup
        $product = Product::with([
            'category',
            'brand',
            'images',
            'specifications.specGroup',
            'variants' => function ($q) {
                $q->where('is_active', true); // Chỉ lấy variant đang bán
            },
            'variants.attributes.attributeGroup',
        ])
            ->where('is_active', true)  // Không lấy sản phẩm đã ẩn
            ->find($id);

        if (!$product) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm.'], 404);
        }

        // Tăng lượt xem
        $product->increment('view_count');

        return new ProductResource($product);
    }

    /**
     * So sánh thông số chi tiết sản phẩm
     * GET /api/products/compare?slugs=slug-a,slug-b
     */
    public function compare(Request $request)
    {
        $slugs = $request->query('slugs');
        if (!$slugs) {
            return response()->json(['message' => 'Vui lòng cung cấp danh sách slug sản phẩm.'], 400);
        }

        $slugList = array_filter(array_map('trim', explode(',', $slugs)));
        if (count($slugList) < 2) {
            return response()->json(['message' => 'Cần ít nhất 2 sản phẩm để so sánh.'], 400);
        }

        $products = Product::with(['images', 'specifications.specGroup'])
            ->whereIn('slug', $slugList)
            ->get();

        if ($products->isEmpty()) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm nào với slugs đã cung cấp.'], 404);
        }

        // Build product summary
        $productList = $products->map(fn($p) => [
            'id' => $p->id,
            'name' => $p->name,
            'slug' => $p->slug,
            'image' => $p->images->first()?->image_path,
            'price' => (float) ($p->sale_price ?? $p->price),
        ]);

        // Collect all spec_group/name combinations across all products
        // Structure: [ groupDisplayName => [ specName => [ productId => value ] ] ]
        $specMatrix = [];
        foreach ($products as $product) {
            foreach ($product->specifications as $spec) {
                $group = $spec->specGroup?->display_name ?? 'Khác';
                $name = $spec->name;
                $specMatrix[$group][$name][$product->id] = $spec->value;
            }
        }

        // Format for frontend comparison table
        $specifications = [];
        foreach ($specMatrix as $group => $attrs) {
            $attrList = [];
            foreach ($attrs as $specName => $valuesByProduct) {
                // Fill null for products that don't have this spec
                $values = [];
                foreach ($products as $p) {
                    $values[$p->id] = $valuesByProduct[$p->id] ?? null;
                }
                $attrList[] = [
                    'name' => $specName,
                    'values' => $values,
                ];
            }
            $specifications[] = [
                'group' => $group,
                'attributes' => $attrList,
            ];
        }

        return response()->json([
            'products' => $productList,
            'specifications' => $specifications,
        ]);
    }
}